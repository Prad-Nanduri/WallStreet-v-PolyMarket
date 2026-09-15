"use client";

import { DEMO_ACTIVITY } from "@/app/demo/data";
import { useArbData } from "./DataProvider";
import DemoToggle from "./DemoToggle";
import ThemeToggle from "./ThemeToggle";
import HeroStat from "./HeroStat";
import EventRow from "./EventRow";

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "green" | "red";
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5 transition-colors hover:border-[var(--muted)]">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
        {label}
      </div>
      <div className="mt-2 font-mono text-[28px] font-semibold leading-none tracking-tight">
        {value}
      </div>
      <div
        className={`mt-2 text-sm ${
          accent === "green"
            ? "text-green"
            : accent === "red"
              ? "text-red"
              : "text-muted"
        }`}
      >
        {sub}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { demo, setDemo, rows, loading, error } = useArbData();
  const significant = rows.filter((r) => r.isSignificant).length;
  const staleCount = rows.filter((r) => r.stale).length;
  const avgSpread = rows.length
    ? rows.reduce((s, r) => s + Math.abs(r.spread), 0) / rows.length
    : 0;

  const exportCsv = () => {
    const header = "event,category,polymarketPct,wallStreetPct,spread,stale\n";
    const body = rows
      .map((r) =>
        [
          `"${r.event.replace(/"/g, '""')}"`,
          r.category,
          r.polymarketPct.toFixed(2),
          r.wallStreetPct.toFixed(2),
          r.spread.toFixed(2),
          r.stale,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "arb-spreads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          Probability Arbitrage
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="rounded-lg border border-border bg-panel px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-text"
          >
            ⇩ Export
          </button>
          <DemoToggle demo={demo} onChange={setDemo} />
          <ThemeToggle />
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <HeroStat rows={rows} />
        <StatCard
          label="Events Tracked"
          value={String(rows.length)}
          sub={demo ? "demo snapshot" : "live Polymarket"}
        />
        <StatCard
          label="Significant Signals"
          value={String(significant)}
          sub="|spread| > 10pp"
          accent={significant > 0 ? "red" : undefined}
        />
        <StatCard
          label="Avg |Spread|"
          value={`${avgSpread.toFixed(1)}pp`}
          sub={staleCount > 0 ? `${staleCount} on demo feed` : "all feeds live"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-border bg-panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Cross-Market Spreads</h2>
            <span className="text-xs text-muted">
              {demo
                ? "Demo mode — hardcoded snapshot"
                : error
                  ? "Live fetch failed"
                  : "Live — refreshes every 30s"}
            </span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-muted">
                <th className="px-4 py-2.5">Event</th>
                <th className="px-4 py-2.5 text-right">Polymarket %</th>
                <th className="px-4 py-2.5 text-right">Wall Street %</th>
                <th className="px-4 py-2.5 text-right">Spread</th>
                <th className="px-4 py-2.5 text-right">Trade Signal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <EventRow key={row.event} row={row} />
              ))}
              {!demo && loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="border-t border-border-soft px-4 py-8 text-center text-sm text-muted"
                  >
                    Loading live data…
                  </td>
                </tr>
              )}
              {!demo && !loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="border-t border-border-soft px-4 py-8 text-center text-sm text-muted"
                  >
                    {error
                      ? "Could not fetch live data — flip to Demo Data."
                      : "No matching markets found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-border bg-panel">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <span className="text-xs text-muted">Today</span>
          </div>
          <ul>
            {DEMO_ACTIVITY.map((a, i) => (
              <li
                key={i}
                className="flex items-center gap-3 border-t border-border-soft px-4 py-3 first:border-t-0 transition-colors hover:bg-[var(--hover)]"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs ${
                    a.side === "buy"
                      ? "bg-green-bg text-green"
                      : "bg-red-bg text-red"
                  }`}
                >
                  {a.side === "buy" ? "↑" : "↓"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.label}</div>
                  <div className="truncate text-xs text-muted">{a.detail}</div>
                </div>
                <span className="text-xs text-muted">{a.when}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="mt-4 text-xs text-muted">
        Wall Street % = discounted Black-Scholes binary probability
        exp(-rT)·N(d2). Fed legs use CME FedWatch-style probabilities, BTC legs
        use Deribit mark IV (DVOL fallback), SPX legs use SPY options ×10
        (approximation). Not investment advice.
      </p>
    </main>
  );
}
