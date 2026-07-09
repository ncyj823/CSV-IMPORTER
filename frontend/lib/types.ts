export type RawCsvRow = Record<string, string>;

export interface ParsedCsv {
  headers: string[];
  rows: RawCsvRow[];
  /** File name, kept for display purposes only. */
  fileName: string;
}

export const CRM_FIELDS = [
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
] as const;

export type CrmField = (typeof CRM_FIELDS)[number];

export type CrmRecord = Record<CrmField, string>;

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

export type AppStep = "upload" | "preview" | "processing" | "result";
