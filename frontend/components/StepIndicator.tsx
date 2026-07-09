import { AppStep } from "@/lib/types";

const STEPS: { key: AppStep; label: string; code: string }[] = [
  { key: "upload", label: "Upload", code: "01_IN" },
  { key: "preview", label: "Preview", code: "02_CHK" },
  { key: "processing", label: "AI Mapping", code: "03_MAP" },
  { key: "result", label: "Result", code: "04_OUT" },
];

export function StepIndicator({ current }: { current: AppStep }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-stretch gap-px overflow-hidden rounded-card border border-base-700 bg-base-800">
      {STEPS.map((step, idx) => {
        const state =
          idx < currentIdx ? "done" : idx === currentIdx ? "active" : "pending";
        return (
          <li
            key={step.key}
            className={[
              "relative flex flex-1 min-w-0 items-center gap-3 px-4 py-3 transition-colors",
              state === "active" ? "bg-signal-soft" : "bg-base-800",
            ].join(" ")}
          >
            <span
              className={[
                "font-mono text-[10px] tracking-widest",
                state === "done"
                  ? "text-signal"
                  : state === "active"
                  ? "text-signal"
                  : "text-base-400",
              ].join(" ")}
            >
              {step.code}
            </span>
            <span
              className={[
                "truncate font-display text-sm font-medium",
                state === "pending" ? "text-base-400" : "text-base-50",
              ].join(" ")}
            >
              {step.label}
            </span>
            {state === "done" && (
              <span className="ml-auto text-signal" aria-hidden>
                ✓
              </span>
            )}
            {idx < STEPS.length - 1 && (
              <span
                className="pointer-events-none absolute -right-px top-0 h-full w-px bg-base-700"
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
