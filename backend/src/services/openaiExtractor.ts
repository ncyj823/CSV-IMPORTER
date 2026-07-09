import OpenAI from "openai";
import { config } from "../config";
import { chunkArray, runWithConcurrency } from "./csvUtils";
import {
  aiBatchResponseSchema,
  AiBatchItem,
  CrmRecord,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  crmRecordSchema,
  ImportResponseBody,
  RawCsvRow,
  SkippedRecord,
} from "../types";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!config.openai.apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to backend/.env before running an import."
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a meticulous data-mapping engine for GrowEasy CRM.

Your job: given raw CSV rows exported from ARBITRARY lead sources (Facebook Lead Ads,
Google Ads, real-estate CRMs, manual spreadsheets, sales reports, agency exports...),
map each row's fields onto the fixed GrowEasy CRM schema below. Column names in the
input are NOT standardized and will vary wildly (e.g. "Full Name" / "lead_name" / "Name",
"Phone" / "Mobile No." / "contact_number", "Email Id" / "email2"). Use semantic judgement,
not exact string matching, to figure out what each column represents.

CRM SCHEMA (return exactly these keys per record):
- created_at: lead creation date/time, formatted so that JavaScript's 'new Date(created_at)'
  parses it correctly (prefer "YYYY-MM-DD HH:mm:ss" or ISO 8601). If no date exists in the
  row, leave it as an empty string — never invent a date.
- name: the lead's full name.
- email: the PRIMARY email address only.
- country_code: phone country code including "+", e.g. "+91". Infer from context
  (e.g. a "Country" column of India, or a number already prefixed with a code) when possible;
  otherwise leave blank rather than guessing.
- mobile_without_country_code: the PRIMARY phone number with the country code stripped off,
  digits only (no spaces, dashes, or parentheses).
- company: company / organization name.
- city, state, country: location fields.
- lead_owner: the salesperson/agent/owner assigned to this lead, if present (often an email
  or a name).
- crm_status: MUST be exactly one of ${CRM_STATUS_VALUES.join(", ")}, or "" if nothing in the
  row indicates status. Infer from free-text status/remarks columns when reasonable
  (e.g. "closed won", "deal done" -> SALE_DONE; "not interested", "junk" -> BAD_LEAD;
  "no response", "unreachable", "call not picked" -> DID_NOT_CONNECT; "interested",
  "follow up", "demo scheduled" -> GOOD_LEAD_FOLLOW_UP). Never invent a status with no
  textual basis.
- crm_note: free text. Put remarks, follow-up notes, and any additional useful information
  here. This is ALSO where you put secondary emails/phone numbers (see rules below).
- data_source: MUST be exactly one of ${DATA_SOURCE_VALUES.join(", ")}, or "" if the row does
  not confidently indicate one of these specific sources. Do NOT guess — only set this if a
  column value clearly names one of these five sources (case-insensitive, allow minor
  formatting differences like spaces/underscores).
- possession_time: property possession timeline, real-estate specific, if present.
- description: any additional descriptive text that doesn't belong in the fields above.

HARD RULES:
1. Multiple emails in one row: use the first as "email"; append the rest into "crm_note"
   (e.g. "Other emails: a@x.com, b@x.com").
2. Multiple phone numbers in one row: use the first as "mobile_without_country_code";
   append the rest into "crm_note" (e.g. "Other numbers: 9876543210, 9123456780").
3. A record must be skipped (skipped: true) if it has NEITHER a usable email NOR a usable
   mobile number anywhere in the row. Give a short skipReason in that case and omit "record".
4. crm_status and data_source must ONLY ever be one of their allowed values above, or "".
   Never output a value outside those lists.
5. Never fabricate data. Missing fields must be empty strings "", never null, never a guess.
6. Keep every field's value on a single logical line — escape internal newlines as \\n so the
   record can safely become one CSV row later.
7. Preserve the original "sourceIndex" for every input row exactly as given, including for
   skipped rows, so results can be matched back to the source data.

You will receive a JSON array of rows, each with a "sourceIndex" and its raw column data.
Call the "return_crm_batch" tool exactly once with one "items" entry per input row (same
count, same sourceIndex values) — never merge, drop, or add rows.`;

const RETURN_BATCH_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "return_crm_batch",
    description:
      "Return the GrowEasy-CRM-mapped result for every row in this batch, one item per input row.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sourceIndex: { type: "integer" },
              skipped: { type: "boolean" },
              skipReason: { type: "string" },
              record: {
                type: "object",
                properties: {
                  created_at: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  country_code: { type: "string" },
                  mobile_without_country_code: { type: "string" },
                  company: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  country: { type: "string" },
                  lead_owner: { type: "string" },
                  crm_status: {
                    type: "string",
                    enum: [...CRM_STATUS_VALUES, ""],
                  },
                  crm_note: { type: "string" },
                  data_source: {
                    type: "string",
                    enum: [...DATA_SOURCE_VALUES, ""],
                  },
                  possession_time: { type: "string" },
                  description: { type: "string" },
                },
                required: [
                  "created_at",
                  "name",
                  "email",
                  "country_code",
                  "mobile_without_country_code",
                  "company",
                  "city",
                  "state",
                  "country",
                  "lead_owner",
                  "crm_status",
                  "crm_note",
                  "data_source",
                  "possession_time",
                  "description",
                ],
              },
            },
            required: ["sourceIndex", "skipped"],
          },
        },
      },
      required: ["items"],
    },
  },
};

interface IndexedRow {
  sourceIndex: number;
  data: RawCsvRow;
}

function isUsableEmail(value: string | undefined): boolean {
  return !!value && /\S+@\S+\.\S+/.test(value.trim());
}

function isUsableMobile(value: string | undefined): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractBatch(
  batch: IndexedRow[],
  attempt = 1
): Promise<{ items: ReturnType<typeof aiBatchResponseSchema.parse>["items"] }> {
  const openai = getClient();

  try {
    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify(
            batch.map((r) => ({ sourceIndex: r.sourceIndex, row: r.data }))
          ),
        },
      ],
      tools: [RETURN_BATCH_TOOL],
      tool_choice: {
        type: "function",
        function: { name: "return_crm_batch" },
      },
    });

    const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "return_crm_batch") {
      throw new Error("Model did not call return_crm_batch");
    }

    const parsedArgs = JSON.parse(toolCall.function.arguments);
    const validated = aiBatchResponseSchema.parse(parsedArgs);
    return validated;
  } catch (err) {
    if (attempt < config.batching.maxRetriesPerBatch) {
      const backoffMs = 500 * 2 ** (attempt - 1);
      await sleep(backoffMs);
      return extractBatch(batch, attempt + 1);
    }
    throw err;
  }
}

export async function extractCrmRecords(
  rows: RawCsvRow[]
): Promise<ImportResponseBody> {
  const indexedRows: IndexedRow[] = rows.map((data, sourceIndex) => ({
    sourceIndex,
    data,
  }));

  const batches = chunkArray(indexedRows, config.batching.batchSize);

  const records: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];
  let batchesFailed = 0;

  const batchResults = await runWithConcurrency(
    batches,
    config.batching.maxConcurrentBatches,
    async (batch) => {
      try {
        return await extractBatch(batch);
      } catch (err) {
        batchesFailed += 1;
        // Fail-safe: if a batch permanently fails after retries, skip its
        // rows individually rather than failing the whole import.
        const fallbackItems: AiBatchItem[] = batch.map((r) => ({
          sourceIndex: r.sourceIndex,
          skipped: true,
          skipReason: `AI extraction failed for this batch: ${
            err instanceof Error ? err.message : "unknown error"
          }`,
          record: undefined,
        }));
        return { items: fallbackItems };
      }
    }
  );

  const rowsByIndex = new Map(indexedRows.map((r) => [r.sourceIndex, r.data]));

  for (const batchResult of batchResults) {
    for (const item of batchResult.items) {
      const originalRow = rowsByIndex.get(item.sourceIndex) ?? {};

      if (item.skipped || !item.record) {
        skipped.push({
          sourceIndex: item.sourceIndex,
          reason: item.skipReason || "Skipped by AI extraction",
          originalRow,
        });
        continue;
      }

      const record = crmRecordSchema.parse(item.record);

      // Backend safety net: enforce the "must have email or mobile" rule
      // regardless of what the model decided.
      if (
        !isUsableEmail(record.email) &&
        !isUsableMobile(record.mobile_without_country_code)
      ) {
        skipped.push({
          sourceIndex: item.sourceIndex,
          reason: "No usable email or mobile number found",
          originalRow,
        });
        continue;
      }

      records.push(record);
    }
  }

  return {
    records,
    skipped,
    totalImported: records.length,
    totalSkipped: skipped.length,
    totalRows: rows.length,
    batchesProcessed: batches.length,
    batchesFailed,
  };
}
