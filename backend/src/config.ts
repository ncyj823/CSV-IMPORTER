import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: numberEnv("PORT", 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  groq: {
    // Only required at runtime when the extraction route is actually hit,
    // so the server can still boot (e.g. for local frontend dev) without a key.
    apiKey: process.env.GROQ_API_KEY ?? "",
    model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  },
  batching: {
    batchSize: numberEnv("BATCH_SIZE", 15),
    maxConcurrentBatches: numberEnv("MAX_CONCURRENT_BATCHES", 3),
    maxRetriesPerBatch: numberEnv("MAX_RETRIES_PER_BATCH", 3),
  },
};

export { requireEnv };
