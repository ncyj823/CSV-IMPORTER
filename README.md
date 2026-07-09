# GrowEasy AI CSV Importer

Upload a lead CSV in **any layout** — Facebook Lead Ads, Google Ads, a real-estate CRM export,
a marketing agency sheet, or something hand-built in Excel — and this maps it into GrowEasy's
fixed CRM schema using an LLM, with no assumptions about column names.

**Position applied for:** _[fill in: Intern / Full-Time]_

---

## How it works

1. **Upload** — drag & drop or pick a `.csv` file. Nothing is sent to a server yet.
2. **Preview** — the file is parsed entirely client-side (Papaparse) and shown in a
   scrollable, sticky-header table exactly as uploaded. Still zero AI calls.
3. **Confirm** — only on clicking "Confirm & run AI import" does the frontend POST the parsed
   `{ headers, rows }` JSON to the backend.
4. **AI mapping** — the backend chunks rows into batches (default 15 rows/batch), sends each
   batch to Groq (Llama 3.3 70B) with a tool-call schema that forces structured output, validates the
   response with Zod, retries failed batches with exponential backoff, and merges everything
   back into one result — preserving row order via `sourceIndex`.
5. **Result** — imported records and skipped records are shown in separate tabs, with a CSV
   export button for the imported set.

## Why this architecture

- **Client-side preview parsing** means Step 2 genuinely does "no AI processing," per the
  spec, and the app feels instant even before anything hits the network.
- **Tool-calling (function calling) instead of free-form JSON** makes the AI's output
  structurally guaranteed to match the CRM schema (including the two closed enums), which
  removes an entire class of "AI returned malformed JSON" bugs.
- **Batching + bounded concurrency** keeps large CSVs from either blowing past context limits
  in one giant prompt, or firing hundreds of simultaneous requests at Groq.
- **A backend-enforced skip rule** double-checks "has email or mobile" after the AI responds,
  so a confident-but-wrong model output can't let an unusable record slip into the CRM.
- **Batch-level retries with a fail-safe** mean one bad batch degrades gracefully into
  "these N rows are skipped, here's why" instead of failing the whole import.

## Project structure

```
groweasy-csv-importer/
├── backend/                 Express + TypeScript API
│   ├── src/
│   │   ├── index.ts         app entrypoint
│   │   ├── config.ts        env config
│   │   ├── types.ts         shared types + Zod schemas (CRM record, enums)
│   │   ├── routes/import.ts /api/parse-csv, /api/import
│   │   ├── services/
│   │   │   ├── csvUtils.ts        CSV parsing, chunking, concurrency runner
│   │   │   └── groqExtractor.ts the AI prompt + batching + retries
│   │   └── middleware/      multer upload, centralized error handler
│   └── Dockerfile
├── frontend/                Next.js 14 (App Router) + TypeScript + Tailwind
│   ├── app/                 layout, global styles, the single page flow
│   ├── components/          FileUpload, PreviewTable, ResultsTable, StepIndicator, SummaryCards
│   ├── lib/                 types, client-side CSV parser, API client
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Local setup

Requires Node 20+.

### 1. Backend

```bash
cd backend
cp .env.example .env
# edit .env and set GROQ_API_KEY
npm install
npm run dev        # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
npm install
npm run dev        # starts on http://localhost:3000
```

Open `http://localhost:3000`, upload a CSV, preview it, confirm, and watch it get mapped.

### 3. Docker (optional)

```bash
GROQ_API_KEY=gsk_... docker compose up --build
```

## API

### `POST /api/parse-csv`
`multipart/form-data`, field `file` — parses a raw CSV upload into `{ headers, rows }`.
No AI involved; exists so the backend also satisfies "accept CSV upload" directly, even
though the primary flow parses client-side for the instant preview.

### `POST /api/import`
```jsonc
// request
{ "headers": ["Full Name", "Phone", "..."], "rows": [{ "Full Name": "John", "Phone": "9876543210" }] }
```
```jsonc
// response
{
  "records": [ /* CrmRecord[] in GrowEasy CRM format */ ],
  "skipped": [ { "sourceIndex": 4, "reason": "No usable email or mobile number found", "originalRow": { } } ],
  "totalImported": 118,
  "totalSkipped": 2,
  "totalRows": 120,
  "batchesProcessed": 8,
  "batchesFailed": 0
}
```

## AI extraction rules implemented

- `crm_status` and `data_source` are constrained to their fixed enum lists (or `""`) via the
  Groq tool-call JSON schema — the model literally cannot return an out-of-list value.
- `created_at` is prompted to stay `new Date()`-parseable; left blank rather than guessed if
  no date exists in the row.
- Multiple emails → first one used as `email`, rest appended to `crm_note`. Same pattern for
  multiple phone numbers.
- A row with neither a usable email nor a usable mobile number is skipped, with the reason
  and original row preserved for review. This is enforced twice: once by prompt instruction,
  once by a backend regex check after the AI responds.
- Every batch is retried up to `MAX_RETRIES_PER_BATCH` (default 3, exponential backoff) before
  falling back to marking its rows as skipped rather than failing the entire import.

## Known limitations / next steps

- No persistence layer — imports are stateless per request (matches the spec's "optional
  database" note). A production version would likely persist `records`/`skipped` for audit.
- No virtualized table yet for very large previews — the preview table caps rendering at 200
  rows client-side (footer notes the true total) to stay smooth; a virtualization library
  (e.g. `@tanstack/react-virtual`) would be the next step for CSVs in the thousands of rows.
- No automated test suite yet — given more time, priority would be: (1) Zod schema unit tests
  for the CRM record validator, (2) an integration test for `/api/import` against a mocked
  Groq client, (3) a snapshot test of the multi-email/multi-phone merge logic.
- Auth/rate-limiting isn't implemented — fine for an assignment, not for production multi-tenant use.
