import { ImportResponseBody } from "@/lib/types";

export function SummaryCards({ result }: { result: ImportResponseBody }) {
  const items: { label: string; value: number | string; accent?: "signal" | "danger" | "amber" }[] = [
    { label: "Total rows", value: result.totalRows },
    { label: "Imported", value: result.totalImported, accent: "signal" },
    { label: "Skipped", value: result.totalSkipped, accent: result.totalSkipped > 0 ? "amber" : undefined },
    { label: "Batches", value: result.batchesProcessed },
    {
      label: "Batch failures",
      value: result.batchesFailed,
      accent: result.batchesFailed > 0 ? "danger" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-card border border-base-700 bg-base-900 px-4 py-3 shadow-panel"
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-base-400">
            {item.label}
          </p>
          <p
            className={[
              "mt-1 font-display text-2xl font-semibold",
              item.accent === "signal"
                ? "text-signal"
                : item.accent === "danger"
                ? "text-danger"
                : item.accent === "amber"
                ? "text-amber"
                : "text-base-50",
            ].join(" ")}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
