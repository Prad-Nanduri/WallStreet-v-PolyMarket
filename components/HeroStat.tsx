import type { ArbitrageRow } from "@/lib/types";

interface Props {
  rows: ArbitrageRow[];
}

export default function HeroStat({ rows }: Props) {
  const top = rows.reduce<ArbitrageRow | null>(
    (best, r) =>
      best === null || Math.abs(r.spread) > Math.abs(best.spread) ? r : best,
    null,
  );

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-muted">
        Largest Dislocation
      </div>
      {top ? (
        <>
          <div className="mt-2 font-mono text-3xl font-semibold">
            {top.spread > 0 ? "+" : ""}
            {top.spread.toFixed(1)}
            <span className="text-lg text-muted">pp</span>
          </div>
          <div className="mt-1 truncate text-sm text-muted">{top.event}</div>
        </>
      ) : (
        <div className="mt-2 text-3xl font-semibold text-muted">—</div>
      )}
    </div>
  );
}
