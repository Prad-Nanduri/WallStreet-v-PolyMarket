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
  const significant = Math.abs(top?.spread ?? 0) > 10;

  return (
    <div className="group rounded-xl border border-border bg-panel p-5 transition-colors hover:border-[var(--muted)]">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-muted">
        Largest Dislocation
        {top && (
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              significant ? "bg-red" : "bg-green"
            }`}
          />
        )}
      </div>
      {top ? (
        <>
          <div
            className={`mt-2 font-mono text-[28px] font-semibold leading-none tracking-tight ${
              significant ? "text-red" : "text-text"
            }`}
          >
            {top.spread > 0 ? "+" : ""}
            {top.spread.toFixed(1)}
            <span className="ml-1 text-base font-normal text-muted">pp</span>
          </div>
          <div className="mt-2 truncate text-sm text-muted">{top.event}</div>
        </>
      ) : (
        <div className="mt-2 font-mono text-[28px] font-semibold leading-none text-muted">
          —
        </div>
      )}
    </div>
  );
}
