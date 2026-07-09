import Papa from "papaparse";
import { ParsedCsv, RawCsvRow } from "./types";

export class CsvParseError extends Error {}

/**
 * Parses a File into headers + row records entirely on the client, so the
 * preview step never touches the backend (and no AI processing happens yet).
 */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      transform: (value) => (typeof value === "string" ? value.trim() : value),
      complete: (result) => {
        const headers = result.meta.fields ?? [];

        if (headers.length === 0) {
          reject(new CsvParseError("Couldn't find any columns in this file."));
          return;
        }

        const rows = (result.data ?? []).filter((row) =>
          Object.values(row).some((v) => typeof v === "string" && v.trim() !== "")
        );

        if (rows.length === 0) {
          reject(new CsvParseError("This CSV has no data rows."));
          return;
        }

        resolve({ headers, rows, fileName: file.name });
      },
      error: (err: Error) => {
        reject(new CsvParseError(err.message || "Failed to parse CSV."));
      },
    });
  });
}
