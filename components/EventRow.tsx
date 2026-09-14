import type { ArbitrageRow } from "@/lib/types";

function signal(spread: number): { label: string; cls: string } {
  if (spread > 10) return { label: "Sell YES — Poly rich", cls: "text-red" };
  if (spread < -10) return { label: "Buy YES — Poly cheap", cls: "text-red" };
  if (Math.abs(spread) < 5) return { label: "Fair", cls: "text-green" };
  return { label: "Watch", cls: "text-muted" };
}

function rowTint(spread: number): string {
  const a = Math.abs(spread);
  if (a > 10)
    return "bg-gradient-to-r from-[var(--red-bg)] to-transparent";
  if (a < 5)
    return "bg-gradient-to-r from-[var(--green-bg)] to-transparent";
  return "";
}

const CATEGORY_BADGE: Record<ArbitrageRow["category"], string> = {
  fed: "FED",
  btc: "BTC",
  spx: "SPX",
};

export default function EventRow({ row }: { row: ArbitrageRow }) {
  const s = signal(row.spread);
  return (
    <tr className={`border-t border-border ${rowTint(row.spread)}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
            {CATEGORY_BADGE[row.category]}
          </span>
          <span className="max-w-[380px] truncate text-sm font-medium">
            {row.event}
          </span>
          {row.stale && (
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
              demo feed
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {row.polymarketPct.toFixed(1)}%
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {row.wallStreetPct.toFixed(1)}%
      </td>
      <td
        className={`px-4 py-3 text-right font-mono text-sm font-semibold ${
          Math.abs(row.spread) > 10
            ? "text-red"
            : Math.abs(row.spread) < 5
              ? "text-green"
              : "text-text"
        }`}
      >
        {row.spread > 0 ? "+" : ""}
        {row.spread.toFixed(1)}pp
      </td>
      <td className={`px-4 py-3 text-right text-sm font-medium ${s.cls}`}>
        {s.label}
      </td>
    </tr>
  );
}
