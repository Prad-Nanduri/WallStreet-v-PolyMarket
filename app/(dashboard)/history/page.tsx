import { DEMO_ACTIVITY } from "@/app/demo/data";

export const metadata = { title: "History — WallSt v Poly" };

export default function HistoryPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-muted">
          Demo execution feed — fills and position changes.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Recent Activity</h2>
          <span className="text-xs text-muted">All time</span>
        </div>
        <ul>
          {DEMO_ACTIVITY.map((a, i) => (
            <li
              key={i}
              className="flex items-center gap-3 border-t border-border-soft px-4 py-3.5 first:border-t-0 transition-colors hover:bg-[var(--hover)]"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm ${
                  a.side === "buy"
                    ? "bg-green-bg text-green"
                    : "bg-red-bg text-red"
                }`}
              >
                {a.side === "buy" ? "↑" : "↓"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{a.label}</div>
                <div className="text-xs text-muted">{a.detail}</div>
              </div>
              <div className="text-right">
                <span
                  className={`font-mono text-[13px] font-semibold ${
                    a.side === "buy" ? "text-green" : "text-red"
                  }`}
                >
                  {a.side.toUpperCase()}
                </span>
                <div className="text-xs text-muted">{a.when}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
