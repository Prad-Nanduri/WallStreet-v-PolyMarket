"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useArbData } from "@/components/DataProvider";
import DemoToggle from "@/components/DemoToggle";
import PositionPnl from "@/components/PositionPnl";

export default function AnalyticsPage() {
  const { demo, setDemo, rows, loading } = useArbData();

  const chart = rows.map((r) => ({
    event: r.event.length > 28 ? r.event.slice(0, 28) + "…" : r.event,
    spread: Number(r.spread.toFixed(2)),
    poly: r.polymarketPct,
    ws: r.wallStreetPct,
  }));

  const buckets = [
    { range: "> +10pp", n: rows.filter((r) => r.spread > 10).length },
    { range: "+5..+10", n: rows.filter((r) => r.spread > 5 && r.spread <= 10).length },
    { range: "±5pp", n: rows.filter((r) => Math.abs(r.spread) <= 5).length },
    { range: "-10..-5", n: rows.filter((r) => r.spread < -5 && r.spread >= -10).length },
    { range: "< -10pp", n: rows.filter((r) => r.spread < -10).length },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Spread distribution across {demo ? "demo" : "live"} events.
          </p>
        </div>
        <DemoToggle demo={demo} onChange={setDemo} />
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-panel p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">
            Spread by Event (pp, Polymarket − Wall Street)
          </h2>
          <div className="h-72">
            {loading && !demo ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Loading live data…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid
                    stroke="var(--border)"
                    horizontal={false}
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    type="number"
                    stroke="var(--muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="event"
                    width={210}
                    stroke="var(--muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--hover)" }}
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--text)",
                    }}
                    formatter={(v) => [`${v}pp`, "spread"]}
                  />
                  <Bar dataKey="spread" radius={[0, 4, 4, 0]}>
                    {chart.map((c, i) => (
                      <Cell
                        key={i}
                        fill={
                          Math.abs(c.spread) > 10
                            ? "var(--red)"
                            : Math.abs(c.spread) < 5
                              ? "var(--green)"
                              : "var(--muted)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-panel">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Spread Buckets</h2>
          </div>
          <ul>
            {buckets.map((b) => (
              <li
                key={b.range}
                className="flex items-center justify-between border-t border-border-soft px-4 py-3 first:border-t-0"
              >
                <span className="font-mono text-[13px] text-muted">
                  {b.range}
                </span>
                <span className="font-mono text-[13px] font-semibold">
                  {b.n}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-4 py-3 text-xs text-muted">
            Red bars are &gt;10pp dislocations — candidate trades. Green bars
            are &lt;5pp — market and model agree.
          </div>
        </section>
      </div>

      <PositionPnl />
    </main>
  );
}
