import { RawCsvRow } from "@/lib/types";

interface PreviewTableProps {
  headers: string[];
  rows: RawCsvRow[];
  /** cap how many rows we render for perf; footer notes the true total */
  maxRows?: number;
}

export function PreviewTable({ headers, rows, maxRows = 200 }: PreviewTableProps) {
  const visibleRows = rows.slice(0, maxRows);
  const truncated = rows.length > maxRows;

  return (
    <div className="overflow-hidden rounded-card border border-base-700 bg-base-900 shadow-panel">
      <div className="scrollbar-thin max-h-[420px] overflow-auto">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-base-800">
            <tr>
              <th className="whitespace-nowrap border-b border-base-700 px-4 py-2.5 font-mono text-[11px] font-medium tracking-wider text-base-400">
                #
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
            {visibleRows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-base-800 last:border-b-0 odd:bg-base-900 even:bg-base-800/40 hover:bg-base-700/40"
              >
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-base-400">
                  {idx + 1}
                </td>
                {headers.map((h) => (
                  <td
                    key={h}
                    className="max-w-[240px] truncate whitespace-nowrap px-4 py-2 text-base-200"
                    title={row[h]}
                  >
                    {row[h] || <span className="text-base-600">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-base-700 bg-base-800 px-4 py-2.5 font-mono text-[11px] text-base-400">
        <span>
          {rows.length} row{rows.length === 1 ? "" : "s"} · {headers.length} column
          {headers.length === 1 ? "" : "s"}
        </span>
        {truncated && <span>showing first {maxRows}</span>}
      </div>
    </div>
  );
}
