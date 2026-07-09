"use client";

import { useCallback, useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { PreviewTable } from "@/components/PreviewTable";
import { ResultsTable } from "@/components/ResultsTable";
import { StepIndicator } from "@/components/StepIndicator";
import { SummaryCards } from "@/components/SummaryCards";
import { importCsvRows } from "@/lib/api";
import { CsvParseError, parseCsvFile } from "@/lib/csvParser";
import { AppStep, ImportResponseBody, ParsedCsv } from "@/lib/types";

const PROCESSING_MESSAGES = [
  "Reading column headers…",
  "Matching columns to CRM fields…",
  "Resolving ambiguous fields…",
  "Merging duplicate emails & numbers…",
  "Validating status & source values…",
  "Almost there…",
];

export default function Home() {
  const [step, setStep] = useState<AppStep>("upload");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [result, setResult] = useState<ImportResponseBody | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [messageIdx, setMessageIdx] = useState(0);

  const handleFileSelected = useCallback(async (file: File) => {
    setUploadError(null);
    setIsParsing(true);
    try {
      const csv = await parseCsvFile(file);
      setParsed(csv);
      setStep("preview");
    } catch (err) {
      setUploadError(
        err instanceof CsvParseError
          ? err.message
          : "Something went wrong reading that file."
      );
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!parsed) return;
    setImportError(null);
    setStep("processing");

    const interval = setInterval(() => {
      setMessageIdx((i) => Math.min(i + 1, PROCESSING_MESSAGES.length - 1));
    }, 1400);

    try {
      const response = await importCsvRows(parsed.headers, parsed.rows);
      setResult(response);
      setStep("result");
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Import failed unexpectedly."
      );
      setStep("preview");
    } finally {
      clearInterval(interval);
      setMessageIdx(0);
    }
  }, [parsed]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setParsed(null);
    setResult(null);
    setUploadError(null);
    setImportError(null);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <p className="font-mono text-xs tracking-widest text-signal">GROWEASY / CRM IMPORT</p>
        <h1 className="font-display text-2xl font-semibold text-base-50 sm:text-3xl">
          AI-powered CSV importer
        </h1>
        <p className="max-w-2xl text-sm text-base-400">
          Upload a lead export in any layout — Facebook, Google Ads, a real-estate CRM, or a
          spreadsheet someone built by hand. The mapping engine figures out the columns for you.
        </p>
      </header>

      <StepIndicator current={step} />

      {step === "upload" && (
        <section className="flex flex-col gap-4">
          <FileUpload
            onFileSelected={handleFileSelected}
            isBusy={isParsing}
            errorMessage={uploadError}
          />
        </section>
      )}

      {step === "preview" && parsed && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg font-medium text-base-50">{parsed.fileName}</p>
              <p className="font-mono text-xs text-base-400">
                No AI processing yet — this is a raw preview of what was uploaded.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="rounded-card border border-base-600 px-4 py-2 font-mono text-xs text-base-300 transition-colors hover:border-base-400"
              >
                Choose different file
              </button>
              <button
                onClick={handleConfirmImport}
                className="rounded-card bg-signal px-5 py-2 font-mono text-xs font-medium text-base-950 transition-opacity hover:opacity-90"
              >
                Confirm &amp; run AI import →
              </button>
            </div>
          </div>

          {importError && (
            <p className="rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {importError}
            </p>
          )}

          <PreviewTable headers={parsed.headers} rows={parsed.rows} />
        </section>
      )}

      {step === "processing" && (
        <section className="flex flex-col items-center justify-center gap-4 rounded-card border border-base-700 bg-base-900 px-8 py-20 text-center shadow-panel">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-base-600 border-t-signal"
            aria-hidden
          />
          <p className="font-display text-base font-medium text-base-50">
            Mapping your CSV into GrowEasy CRM format
          </p>
          <p className="font-mono text-xs text-base-400">
            {PROCESSING_MESSAGES[messageIdx]}
          </p>
        </section>
      )}

      {step === "result" && result && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-lg font-medium text-base-50">Import complete</p>
            <button
              onClick={handleReset}
              className="rounded-card border border-base-600 px-4 py-2 font-mono text-xs text-base-300 transition-colors hover:border-base-400"
            >
              Import another CSV
            </button>
          </div>
          <SummaryCards result={result} />
          <ResultsTable result={result} />
        </section>
      )}
    </main>
  );
}
