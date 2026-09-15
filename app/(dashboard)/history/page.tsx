import ActivityFeed from "@/components/ActivityFeed";

export const metadata = { title: "History — WallSt v Poly" };

export default function HistoryPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-muted">
          Your recorded position changes (localStorage). Falls back to the
          demo feed until you add or close a position.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Recent Activity</h2>
          <span className="text-xs text-muted">All time</span>
        </div>
        <ActivityFeed large />
      </section>
    </main>
  );
}
