import { ImportResponseBody, RawCsvRow } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function importCsvRows(
  headers: string[],
  rows: RawCsvRow[]
): Promise<ImportResponseBody> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headers, rows }),
    });
  } catch {
    throw new ApiError(
      "Couldn't reach the import server. Is the backend running?"
    );
  }

  if (!response.ok) {
    let message = `Import failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON; keep default message
    }
    throw new ApiError(message, response.status);
  }

  return response.json();
}
