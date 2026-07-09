import { Router } from "express";
import { z } from "zod";
import { csvUpload } from "../middleware/upload";
import { ApiError } from "../middleware/errorHandler";
import { parseCsvText } from "../services/csvUtils";
import { extractCrmRecords } from "../services/groqExtractor";

export const importRouter = Router();

const importRequestSchema = z.object({
  headers: z.array(z.string()).min(1, "CSV has no headers"),
  rows: z
    .array(z.record(z.string(), z.string()))
    .min(1, "CSV has no data rows"),
});

/**
 * POST /api/parse-csv
 * Accepts a raw .csv file upload and returns { headers, rows } as JSON.
 * This exists so the backend also satisfies "accept CSV upload" directly,
 * even though the primary frontend flow parses client-side for an instant
 * preview and only calls this route's sibling (/api/import) on confirm.
 * No AI processing happens here.
 */
importRouter.post(
  "/parse-csv",
  csvUpload.single("file"),
  (req, res, next) => {
    try {
      if (!req.file) {
        throw new ApiError(400, "No file uploaded (expected field 'file')");
      }
      const csvText = req.file.buffer.toString("utf-8");
      const parsed = parseCsvText(csvText);

      if (parsed.rows.length === 0) {
        throw new ApiError(400, "CSV contains no data rows");
      }

      res.status(200).json(parsed);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/import
 * Accepts already-parsed { headers, rows } (as confirmed by the user in the
 * preview step), sends rows to the AI in batches, and returns structured
 * GrowEasy CRM records plus a skipped list and summary counts.
 */
importRouter.post("/import", async (req, res, next) => {
  try {
    const body = importRequestSchema.parse(req.body);

    if (body.rows.length > 5000) {
      throw new ApiError(
        413,
        "CSV too large: this endpoint supports up to 5000 rows per import"
      );
    }

    const result = await extractCrmRecords(body.rows);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
