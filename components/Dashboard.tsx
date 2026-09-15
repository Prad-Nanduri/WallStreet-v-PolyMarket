"use client";

import { useRef, useState } from "react";
import type { EventCategory, SearchRow } from "@/lib/types";
import { useArbData } from "./DataProvider";
import ActivityFeed from "./ActivityFeed";
import DemoToggle from "./DemoToggle";
import ThemeToggle from "./ThemeToggle";
import HeroStat from "./HeroStat";
import EventRow from "./EventRow";
import TableSkeleton from "./TableSkeleton";
import TableErrorBoundary from "./TableErrorBoundary";

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

const CATEGORY_FILTERS: { key: EventCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fed", label: "Fed" },
  { key: "btc", label: "BTC" },
  { key: "crypto", label: "Crypto" },
  { key: "spx", label: "SPX" },
  { key: "sports", label: "Sports" },
  { key: "pol", label: "Politics" },
  { key: "geo", label: "Geopolitics" },
  { key: "misc", label: "Culture" },
];

export default function Dashboard() {
  const { demo, setDemo, rows, loading, error } = useArbData();
  const [cat, setCat] = useState<EventCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [showDemoLegs, setShowDemoLegs] = useState(false);
  // Live mode hides rows whose Wall Street leg fell back to demo data —
  // a placeholder comparison is worse than no row. Demo mode shows all.
  const liveRows = demo || showDemoLegs ? rows : rows.filter((r) => !r.stale);
  const hiddenStale = rows.length - liveRows.length;
  const catCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});
  const [searchRows, setSearchRows] = useState<SearchRow[] | null>(null);
  const [searching, setSearching] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced live search across Polymarket + Kalshi for arbitrary topics.
  const onQuery = (v: string) => {
    setQuery(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = v.trim();
    if (q.length < 3) {
      setSearchRows(null);
      return;
    }
    searchTimer.current = setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : { rows: [] }))
        .then((d: { rows: SearchRow[] }) => setSearchRows(d.rows))
        .catch(() => setSearchRows([]))
        .finally(() => setSearching(false));
    }, 500);
  };

  const visible = liveRows.filter(
    (r) =>
      (cat === "all" || r.category === cat) &&
      (!query || r.event.toLowerCase().includes(query.toLowerCase())),
  );
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
          sub={staleCount > 0 ? `${staleCount} rows w/ demo legs` : "all legs live"}
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
                  : staleCount > 0
                    ? `Live — ${staleCount} row${staleCount === 1 ? "" : "s"} on demo legs`
                    : "Live — refreshes every 30s"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5">
            {CATEGORY_FILTERS.map((f) => {
              const count =
                f.key === "all" ? rows.length : (catCounts[f.key] ?? 0);
              return (
                <button
                  key={f.key}
                  onClick={() => setCat(f.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    cat === f.key
                      ? "bg-panel-2 text-text"
                      : "text-muted hover:bg-[var(--hover)] hover:text-text"
                  }`}
                >
                  {f.label}
                  <span className="ml-1 text-[10px] text-muted">{count}</span>
                </button>
              );
            })}
            {!demo && hiddenStale > 0 && (
              <button
                onClick={() => setShowDemoLegs((s) => !s)}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-text"
                title="Rows whose Wall Street leg fell back to demo data"
              >
                {showDemoLegs ? "hide" : "show"} {hiddenStale} demo-leg
              </button>
            )}
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search any topic — tesla, pope, lakers…"
              className="ml-auto w-64 rounded-md border border-border bg-panel-2 px-2.5 py-1 text-xs text-text placeholder:text-muted focus:outline-none"
            />
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-muted">
                <th className="px-4 py-2.5">Event</th>
                <th className="px-4 py-2.5 text-right">Polymarket %</th>
                <th className="px-4 py-2.5 text-right">Wall Street %</th>
                <th className="px-4 py-2.5 text-right">Spread</th>
                <th className="px-4 py-2.5">7d Trend</th>
                <th className="px-4 py-2.5 text-right">Trade Signal</th>
              </tr>
            </thead>
            <tbody>
              <TableErrorBoundary>
                {searchRows === null
                  ? visible.map((row) => <EventRow key={row.event} row={row} />)
                  : searchRows.map((row) => (
                      <SearchResultRow key={row.event} row={row} />
                    ))}
              </TableErrorBoundary>
              {!demo && loading && <TableSkeleton rows={4} />}
              {!demo && !loading && visible.length === 0 && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="border-t border-border-soft px-4 py-8 text-center text-sm text-muted"
                  >
                    {error
                      ? "Could not fetch live data — flip to Demo Data."
                      : "No matching markets found."}
                  </td>
                </tr>
              )}
              {searching && (
                <tr>
                  <td
                    colSpan={6}
                    className="border-t border-border-soft px-4 py-6 text-center text-sm text-muted"
                  >
                    Searching Polymarket & Kalshi…
                  </td>
                </tr>
              )}
              {searchRows !== null && !searching && searchRows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="border-t border-border-soft px-4 py-6 text-center text-sm text-muted"
                  >
                    No markets on Polymarket or Kalshi for this topic.
                  </td>
                </tr>
              )}
              {visible.length === 0 && liveRows.length > 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="border-t border-border-soft px-4 py-6 text-center text-sm text-muted"
                  >
                    No rows match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-panel">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <span className="text-xs text-muted">Today</span>
          </div>
          <ActivityFeed note />
        </section>
      </div>

      <p className="mt-4 text-xs text-muted">
        Wall Street % = discounted Black-Scholes binary probability
        exp(-rT)·N(d2). BTC legs use live Deribit mark IV (DVOL fallback),
        SPX legs use live CBOE SPY IV30 ×10 (approximation), Fed legs use
        FedWatch-style demo values (CME API requires a license). Not
        investment advice.
      </p>
    </main>
  );
}

const SEARCH_BADGE: Record<string, string> = {
  fed: "FED",
  btc: "BTC",
  spx: "SPX",
  pol: "POL",
  sports: "SPT",
  crypto: "CRYPTO",
  geo: "GEO",
  misc: "MISC",
  other: "—",
};

function Leg({
  pct,
  via,
}: {
  pct: number | null;
  via?: string;
}) {
  if (pct === null)
    return (
      <td className="px-4 py-3 text-right font-mono text-[12px] text-muted">
        no market
      </td>
    );
  return (
    <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums">
      {pct.toFixed(1)}%
      {via && (
        <div className="text-[10px] font-normal text-muted">via {via}</div>
      )}
    </td>
  );
}

function SearchResultRow({ row }: { row: SearchRow }) {
  return (
    <tr className="border-t border-border-soft transition-colors hover:bg-[var(--hover)]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-md border border-border bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-muted">
            {SEARCH_BADGE[row.category] ?? "—"}
          </span>
          <span className="max-w-[400px] truncate text-sm font-medium">
            {row.event}
          </span>
        </div>
      </td>
      <Leg pct={row.polymarketPct} via="Polymarket" />
      <Leg pct={row.wallStreetPct} via={row.wallStreetSource} />
      <td className="px-4 py-3 text-right font-mono text-[13px] font-semibold tabular-nums text-muted">
        {row.spread === null
          ? "—"
          : `${row.spread > 0 ? "+" : ""}${row.spread.toFixed(1)}pp`}
      </td>
      <td className="px-4 py-3 text-muted">—</td>
      <td className="px-4 py-3 text-right text-[13px] text-muted">
        {row.spread === null
          ? "—"
          : Math.abs(row.spread) > 10
            ? "Spread >10pp"
            : "Watch"}
      </td>
    </tr>
  );
}
