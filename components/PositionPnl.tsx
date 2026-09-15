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
import { useArbData } from "./DataProvider";
import { usePortfolio } from "@/lib/portfolio";

/** P&L% per open position, marked against the active (live or demo) feed. */
export default function PositionPnl() {
  const { rows } = useArbData();
  const { positions } = usePortfolio();

  const data = positions
    .map((p) => {
      const norm = p.event.toLowerCase();
      const hit = rows.find(
        (r) =>
          r.event.toLowerCase() === norm ||
          r.event.toLowerCase().includes(norm) ||
          norm.includes(r.event.toLowerCase()),
      );
      if (!hit) return null;
      const yes = hit.polymarketPct / 100;
      const mark = p.side === "yes" ? yes : 1 - yes;
      return {
        event: p.event.length > 28 ? p.event.slice(0, 28) + "…" : p.event,
        pnl: Number((((mark - p.avgPrice) / p.avgPrice) * 100).toFixed(1)),
      };
    })
    .filter((d): d is { event: string; pnl: number } => d !== null);

  return (
    <section className="mt-4 rounded-xl border border-border bg-panel p-5">
      <h2 className="mb-1 text-sm font-semibold">Position P&amp;L (%)</h2>
      <p className="mb-4 text-xs text-muted">
        Your open positions marked against the active feed.
      </p>
      <div className="h-56">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Add positions on the Portfolio page to see P&amp;L here.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
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
                unit="%"
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
                formatter={(v) => [`${v}%`, "P&L"]}
              />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.pnl >= 0 ? "var(--green)" : "var(--red)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
