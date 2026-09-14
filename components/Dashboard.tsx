"use client";

import { useState } from "react";
import useSWR from "swr";
import type { ArbitrageRow } from "@/lib/types";
import { DEMO_ROWS } from "@/app/demo/data";
import DemoToggle from "./DemoToggle";
import ThemeToggle from "./ThemeToggle";
import HeroStat from "./HeroStat";
import EventRow from "./EventRow";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    return r.json();
  });

export default function Dashboard() {
  const [demo, setDemo] = useState(true);
  const { data, error, isLoading } = useSWR<{ rows: ArbitrageRow[] }>(
    demo ? null : "/api/arbitrage",
    fetcher,
    { refreshInterval: 30_000 },
  );

  const rows = demo ? DEMO_ROWS : (data?.rows ?? []);
  const significant = rows.filter((r) => r.isSignificant).length;
  const staleCount = rows.filter((r) => r.stale).length;
  const avgSpread = rows.length
    ? rows.reduce((s, r) => s + Math.abs(r.spread), 0) / rows.length
    : 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          Probability Arbitrage
        </h1>
        <div className="flex items-center gap-2">
          <DemoToggle demo={demo} onChange={setDemo} />
          <ThemeToggle />
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <HeroStat rows={rows} />
        <div className="rounded-xl border border-border bg-panel p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted">
            Events Tracked
          </div>
          <div className="mt-2 font-mono text-3xl font-semibold">
            {rows.length}
          </div>
          <div className="mt-1 text-sm text-muted">
            {demo ? "demo snapshot" : "live Polymarket"}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-panel p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted">
            Significant Signals
          </div>
          <div className="mt-2 font-mono text-3xl font-semibold">
            {significant}
          </div>
          <div className="mt-1 text-sm text-muted">|spread| &gt; 10pp</div>
        </div>
        <div className="rounded-xl border border-border bg-panel p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-muted">
            Avg |Spread|
          </div>
          <div className="mt-2 font-mono text-3xl font-semibold">
            {avgSpread.toFixed(1)}
            <span className="text-lg text-muted">pp</span>
          </div>
          <div className="mt-1 text-sm text-muted">
            {staleCount > 0 ? `${staleCount} on demo feed` : "all feeds live"}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-panel">
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
            <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted">
              <th className="px-4 py-2">Event</th>
              <th className="px-4 py-2 text-right">Polymarket %</th>
              <th className="px-4 py-2 text-right">Wall Street %</th>
              <th className="px-4 py-2 text-right">Spread</th>
              <th className="px-4 py-2 text-right">Trade Signal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <EventRow key={row.event} row={row} />
            ))}
            {!demo && isLoading && (
              <tr>
                <td
                  colSpan={5}
                  className="border-t border-border px-4 py-8 text-center text-sm text-muted"
                >
                  Loading live data…
                </td>
              </tr>
            )}
            {!demo && !isLoading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="border-t border-border px-4 py-8 text-center text-sm text-muted"
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

      <p className="mt-4 text-xs text-muted">
        Wall Street % = discounted Black-Scholes binary probability
        exp(-rT)·N(d2). Fed legs use CME FedWatch-style probabilities, BTC legs
        use Deribit mark IV (DVOL fallback), SPX legs use SPY options ×10
        (approximation). Not investment advice.
      </p>
    </main>
  );
}
