import { DEMO_HOLDINGS } from "@/app/demo/data";

export const metadata = { title: "Portfolio — WallSt v Poly" };

const fmt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function PortfolioPage() {
  const totals = DEMO_HOLDINGS.map((h) => ({
    ...h,
    value: h.shares * h.current,
    cost: h.shares * h.avgCost,
    pnl: (h.current - h.avgCost) / h.avgCost,
  }));
  const portfolioValue = totals.reduce((s, t) => s + t.value, 0);
  const totalCost = totals.reduce((s, t) => s + t.cost, 0);
  const dayPnl = portfolioValue * 0.0044;
  const cash = 124_500;

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Portfolio</h1>
        <p className="mt-1 text-sm text-muted">
          Demo holdings — mirrors the reference terminal layout.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Portfolio Value",
            value: `$${fmt(portfolioValue + cash)}`,
            sub: `+$${fmt(portfolioValue - totalCost)} all-time`,
            accent: true,
          },
          {
            label: "Today's P&L",
            value: `+$${fmt(dayPnl)}`,
            sub: "+0.44%",
            accent: true,
          },
          {
            label: "Total Return",
            value: `+${(((portfolioValue - totalCost) / totalCost) * 100).toFixed(2)}%`,
            sub: "since inception",
            accent: true,
          },
          {
            label: "Cash Balance",
            value: `$${fmt(cash)}`,
            sub: `${((cash / (portfolioValue + cash)) * 100).toFixed(1)}% of portfolio`,
            accent: false,
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-border bg-panel p-5 transition-colors hover:border-[var(--muted)]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              {c.label}
            </div>
            <div className="mt-2 font-mono text-[28px] font-semibold leading-none tracking-tight">
              {c.value}
            </div>
            <div
              className={`mt-2 text-sm ${c.accent ? "text-green" : "text-muted"}`}
            >
              {c.sub}
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Holdings</h2>
          <span className="text-xs text-muted">All Assets</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-muted">
              <th className="px-4 py-2.5">Symbol</th>
              <th className="px-4 py-2.5 text-right">Shares</th>
              <th className="px-4 py-2.5 text-right">Avg Cost</th>
              <th className="px-4 py-2.5 text-right">Current</th>
              <th className="px-4 py-2.5 text-right">P&L</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((h) => (
              <tr
                key={h.symbol}
                className="border-t border-border-soft transition-colors hover:bg-[var(--hover)]"
              >
                <td className="px-4 py-3">
                  <div className="font-mono text-[13px] font-semibold">
                    {h.symbol}
                  </div>
                  <div className="text-xs text-muted">{h.name}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums">
                  {fmt(h.shares)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-muted">
                  ${h.avgCost.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums">
                  ${h.current.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`rounded-md px-2 py-1 font-mono text-xs font-semibold ${
                      h.pnl >= 0
                        ? "bg-green-bg text-green"
                        : "bg-red-bg text-red"
                    }`}
                  >
                    {h.pnl >= 0 ? "+" : ""}
                    {(h.pnl * 100).toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
