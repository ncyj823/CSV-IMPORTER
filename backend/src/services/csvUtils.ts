import Papa from "papaparse";
import { RawCsvRow } from "../types";

export interface ParsedCsv {
  headers: string[];
  rows: RawCsvRow[];
}

/**
 * Parses raw CSV text into headers + row objects, without assuming any
 * fixed column names. Used by the optional /api/parse-csv file-upload path
 * (the primary flow parses on the client for instant preview, and only
 * sends already-parsed JSON to the backend).
 */
export function parseCsvText(csvText: string): ParsedCsv {
  const result = Papa.parse<RawCsvRow>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
    transform: (value) => (typeof value === "string" ? value.trim() : value),
  });

  if (result.errors.length > 0) {
    const fatal = result.errors.filter((e) => e.type !== "FieldMismatch");
    if (fatal.length > 0) {
      throw new Error(
        `CSV parsing failed: ${fatal.map((e) => e.message).join("; ")}`
      );
    }
  }

  const headers = result.meta.fields ?? [];
  const rows = (result.data ?? []).filter((row) =>
    Object.values(row).some((v) => typeof v === "string" && v.trim() !== "")
  );

  return { headers, rows };
}

/** Splits an array into fixed-size chunks, preserving order. */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunkArray size must be > 0");
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Runs async tasks with a concurrency cap so we don't fire hundreds of
 * simultaneous OpenAI requests for large CSVs.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function runNext(): Promise<void> {
    const current = cursor++;
    if (current >= items.length) return;
    results[current] = await worker(items[current], current);
    await runNext();
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runNext()
  );
  await Promise.all(workers);
  return results;
}
