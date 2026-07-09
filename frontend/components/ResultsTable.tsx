"use client";

import { useMemo, useState } from "react";
import { CRM_FIELDS, ImportResponseBody } from "@/lib/types";

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (val: string) => {
    const needsQuotes = /[",\n]/.test(val);
    const escaped = val.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) lines.push(row.map(escape).join(","));
  return lines.join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ResultsTable({ result }: { result: ImportResponseBody }) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  const skippedHeaders = useMemo(() => {
    const headerSet = new Set<string>();
    for (const s of result.skipped) {
      Object.keys(s.originalRow).forEach((h) => headerSet.add(h));
    }
    return Array.from(headerSet);
  }, [result.skipped]);

  const handleExportImported = () => {
    const rows = result.records.map((r) => CRM_FIELDS.map((f) => r[f] ?? ""));
    downloadCsv("groweasy_crm_import.csv", toCsv([...CRM_FIELDS], rows));
  };

  return (
    <div className="rounded-card border border-base-700 bg-base-900 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-700 px-2 py-2">
        <div className="flex gap-1">
          <TabButton
            active={tab === "imported"}
            onClick={() => setTab("imported")}
            label={`Imported (${result.records.length})`}
          />
          <TabButton
            active={tab === "skipped"}
            onClick={() => setTab("skipped")}
            label={`Skipped (${result.skipped.length})`}
            accent="amber"
          />
        </div>
        {tab === "imported" && result.records.length > 0 && (
          <button
            onClick={handleExportImported}
            className="rounded-card border border-base-600 px-3 py-1.5 font-mono text-xs text-base-200 transition-colors hover:border-signal hover:text-signal"
          >
            Export CSV ↓
          </button>
        )}
      </div>

      {tab === "imported" ? (
        <ImportedTable records={result.records} />
      ) : (
        <SkippedTable headers={skippedHeaders} skipped={result.skipped} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accent?: "amber";
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-card px-3 py-1.5 font-mono text-xs transition-colors",
        active
          ? accent === "amber"
            ? "bg-amber-soft text-amber"
            : "bg-signal-soft text-signal"
          : "text-base-400 hover:text-base-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function ImportedTable({ records }: { records: ImportResponseBody["records"] }) {
  if (records.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-base-400">
        No records were successfully mapped.
      </p>
    );
  }

  return (
    <div className="scrollbar-thin max-h-[480px] overflow-auto">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-base-800">
          <tr>
            <th className="whitespace-nowrap border-b border-base-700 px-4 py-2.5 font-mono text-[11px] font-medium tracking-wider text-base-400">
              #
            </th>
            {CRM_FIELDS.map((f) => (
              <th
                key={f}
                className="whitespace-nowrap border-b border-base-700 px-4 py-2.5 font-mono text-[11px] font-medium tracking-wider text-signal"
              >
                {f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((rec, idx) => (
            <tr
              key={idx}
              className="border-b border-base-800 last:border-b-0 odd:bg-base-900 even:bg-base-800/40 hover:bg-base-700/40"
            >
              <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-base-400">
                {idx + 1}
              </td>
              {CRM_FIELDS.map((f) => (
                <td
                  key={f}
                  className="max-w-[220px] truncate whitespace-nowrap px-4 py-2 text-base-200"
                  title={rec[f]}
                >
                  {rec[f] || <span className="text-base-600">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkippedTable({
  headers,
  skipped,
}: {
  headers: string[];
  skipped: ImportResponseBody["skipped"];
}) {
  if (skipped.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-base-400">
        Nothing was skipped — every row had an email or mobile number.
      </p>
    );
  }

  return (
    <div className="scrollbar-thin max-h-[480px] overflow-auto">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-base-800">
          <tr>
            <th className="whitespace-nowrap border-b border-base-700 px-4 py-2.5 font-mono text-[11px] font-medium tracking-wider text-base-400">
              #
            </th>
            <th className="whitespace-nowrap border-b border-base-700 px-4 py-2.5 font-mono text-[11px] font-medium tracking-wider text-amber">
              reason
            </th>
            {headers.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap border-b border-base-700 px-4 py-2.5 font-mono text-[11px] font-medium tracking-wider text-base-200"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {skipped.map((s) => (
            <tr
              key={s.sourceIndex}
              className="border-b border-base-800 last:border-b-0 odd:bg-base-900 even:bg-base-800/40 hover:bg-base-700/40"
            >
              <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-base-400">
                {s.sourceIndex + 1}
              </td>
              <td className="max-w-[260px] whitespace-normal px-4 py-2 text-amber">
                {s.reason}
              </td>
              {headers.map((h) => (
                <td
                  key={h}
                  className="max-w-[220px] truncate whitespace-nowrap px-4 py-2 text-base-200"
                  title={s.originalRow[h]}
                >
                  {s.originalRow[h] || <span className="text-base-600">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
