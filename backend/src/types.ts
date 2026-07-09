import { z } from "zod";

// ---- CRM enums, fixed by the GrowEasy spec ----
export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export const crmStatusSchema = z.union([
  z.enum(CRM_STATUS_VALUES),
  z.literal(""),
]);

export const dataSourceSchema = z.union([
  z.enum(DATA_SOURCE_VALUES),
  z.literal(""),
]);

// ---- A single raw row coming from the uploaded CSV (unknown column names) ----
export type RawCsvRow = Record<string, string>;

// ---- A single extracted / normalized CRM record ----
export const crmRecordSchema = z.object({
  created_at: z.string().default(""),
  name: z.string().default(""),
  email: z.string().default(""),
  country_code: z.string().default(""),
  mobile_without_country_code: z.string().default(""),
  company: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  country: z.string().default(""),
  lead_owner: z.string().default(""),
  crm_status: crmStatusSchema.default(""),
  crm_note: z.string().default(""),
  data_source: dataSourceSchema.default(""),
  possession_time: z.string().default(""),
  description: z.string().default(""),
});

export type CrmRecord = z.infer<typeof crmRecordSchema>;

// What the AI is asked to return for one batch: either a mapped record,
// or an explicit skip with the original row index preserved so we can
// reconcile it back against the source rows.
export const aiBatchItemSchema = z.object({
  sourceIndex: z.number().int().nonnegative(),
  skipped: z.boolean().default(false),
  skipReason: z.string().optional().default(""),
  record: crmRecordSchema.partial().optional(),
});

export const aiBatchResponseSchema = z.object({
  items: z.array(aiBatchItemSchema),
});

export type AiBatchItem = z.infer<typeof aiBatchItemSchema>;

// ---- API request/response contracts ----
export interface ImportRequestBody {
  headers: string[];
  rows: RawCsvRow[];
}

export interface SkippedRecord {
  sourceIndex: number;
  reason: string;
  originalRow: RawCsvRow;
}

export interface ImportResponseBody {
  records: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  totalRows: number;
  batchesProcessed: number;
  batchesFailed: number;
}
