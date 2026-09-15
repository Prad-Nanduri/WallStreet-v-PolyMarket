import type { ArbitrageRow } from "@/lib/types";
import Sparkline from "./Sparkline";

function signal(spread: number): { label: string; cls: string } {
  if (spread > 10) return { label: "Sell YES — Poly rich", cls: "text-red" };
  if (spread < -10) return { label: "Buy YES — Poly cheap", cls: "text-red" };
  if (Math.abs(spread) < 5) return { label: "Fair", cls: "text-green" };
  return { label: "Watch", cls: "text-muted" };
}

function rowTint(spread: number): string {
  const a = Math.abs(spread);
  if (a > 10)
    return "bg-gradient-to-r from-[var(--red-bg)] via-[var(--red-bg)] to-transparent";
  if (a < 5)
    return "bg-gradient-to-r from-[var(--green-bg)] via-[var(--green-bg)] to-transparent";
  return "";
}

const CATEGORY_BADGE: Record<ArbitrageRow["category"], string> = {
  fed: "FED",
  btc: "BTC",
  spx: "SPX",
  pol: "POL",
};

export default function EventRow({ row }: { row: ArbitrageRow }) {
  const s = signal(row.spread);
  return (
    <tr
      className={`border-t border-border-soft transition-colors hover:bg-[var(--hover)] ${rowTint(
        row.spread,
      )}`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-md border border-border bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-muted">
            {CATEGORY_BADGE[row.category]}
          </span>
          <span className="max-w-[400px] truncate text-sm font-medium">
            {row.event}
          </span>
          {row.stale && (
            <span
              title="One leg of this row uses demo values (FedWatch needs a CME license; elections have no options market) — the other leg is live."
              className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted"
            >
              demo leg
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums">
        {row.polymarketPct.toFixed(1)}%
      </td>
      <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-muted">
        {row.wallStreetPct.toFixed(1)}%
      </td>
      <td
        className={`px-4 py-3 text-right font-mono text-[13px] font-semibold tabular-nums ${
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
      <td className="px-4 py-3">
        <Sparkline points={row.sparkline} />
      </td>
      <td className={`px-4 py-3 text-right text-[13px] font-medium ${s.cls}`}>
        {s.label}
      </td>
    </tr>
  );
}
