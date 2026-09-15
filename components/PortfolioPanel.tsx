"use client";

import { useRef, useState } from "react";
import { useArbData } from "./DataProvider";
import {
  parsePositionsCsv,
  portfolio,
  usePortfolio,
  type Position,
} from "@/lib/portfolio";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/** Fuzzy-match a position's event title to a live arbitrage row. */
function markFor(event: string, rows: { event: string; polymarketPct: number }[]) {
  const norm = event.toLowerCase();
  const hit = rows.find(
    (r) =>
      r.event.toLowerCase() === norm ||
      r.event.toLowerCase().includes(norm) ||
      norm.includes(r.event.toLowerCase()),
  );
  return hit ? hit.polymarketPct / 100 : null;
}

const inputCls =
  "rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-[var(--muted)]";

export default function PortfolioPanel() {
  const { rows, demo } = useArbData();
  const { positions } = usePortfolio();
  const fileRef = useRef<HTMLInputElement>(null);

  const [event, setEvent] = useState("");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [wallet, setWallet] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const marks = positions.map((p: Position) => {
    const mark = markFor(p.event, rows);
    const value = mark !== null ? mark * p.size : null;
    const cost = p.avgPrice * p.size;
    const pnlPct = mark !== null ? (mark - p.avgPrice) / p.avgPrice : null;
    return { ...p, mark, value, cost, pnlPct };
  });
  const totalValue = marks.reduce((s, m) => s + (m.value ?? m.cost), 0);
  const totalCost = marks.reduce((s, m) => s + m.cost, 0);
  const allTimePnl = totalValue - totalCost;
  const marked = marks.filter((m) => m.mark !== null).length;

  const add = () => {
    const s = Number(size);
    let p = Number(price);
    if (!event.trim() || !Number.isFinite(s) || s <= 0 || !Number.isFinite(p)) {
      setNotice("Fill in event, size and price.");
      return;
    }
    if (p > 1) p /= 100;
    if (p <= 0 || p >= 1) {
      setNotice("Price must be between 0 and 1 (or 1–99 in cents).");
      return;
    }
    portfolio.addPosition({
      event: event.trim(),
      side,
      size: s,
      avgPrice: p,
      source: "manual",
    });
    setEvent("");
    setSize("");
    setPrice("");
    setNotice(null);
  };

  const onCsv = async (f: File) => {
    const text = await f.text();
    const parsed = parsePositionsCsv(text);
    if (parsed.length === 0) {
      setNotice("No valid rows — expected: event,side(yes|no),size,price");
      return;
    }
    portfolio.importPositions(
      parsed.map((p) => ({ ...p, source: "csv" as const })),
      `CSV import — ${f.name}`,
    );
    setNotice(`Imported ${parsed.length} positions from CSV.`);
  };

  const importWallet = async () => {
    const w = wallet.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(w)) {
      setNotice("Enter a valid 0x… wallet address.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/wallet?wallet=${encodeURIComponent(w)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "import failed");
      const ps = (data.positions as {
        event: string;
        side: "yes" | "no";
        size: number;
        avgPrice: number | null;
      }[])
        .filter((p) => p.avgPrice !== null && p.avgPrice > 0)
        .map((p) => ({
          event: p.event,
          side: p.side,
          size: p.size,
          avgPrice: p.avgPrice as number,
          source: "wallet" as const,
        }));
      if (ps.length === 0) {
        setNotice("Wallet has no positions with a non-zero entry price.");
      } else {
        portfolio.importPositions(ps, `Wallet import ${w.slice(0, 6)}…${w.slice(-4)}`);
        setNotice(`Imported ${ps.length} positions from wallet.`);
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Wallet import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Positions Value",
            value: `$${fmt(totalValue)}`,
            sub: `${allTimePnl >= 0 ? "+" : ""}$${fmt(allTimePnl)} all-time`,
            accent: allTimePnl >= 0 ? ("green" as const) : ("red" as const),
          },
          {
            label: "Cost Basis",
            value: `$${fmt(totalCost)}`,
            sub: `${positions.length} position${positions.length === 1 ? "" : "s"}`,
          },
          {
            label: "Return",
            value:
              totalCost > 0
                ? `${allTimePnl >= 0 ? "+" : ""}${((allTimePnl / totalCost) * 100).toFixed(2)}%`
                : "—",
            sub: "since entry",
            accent: allTimePnl >= 0 ? ("green" as const) : ("red" as const),
          },
          {
            label: "Live Marks",
            value: `${marked}/${positions.length}`,
            sub: demo ? "vs. demo feed" : "vs. live Polymarket",
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
              className={`mt-2 text-sm ${
                c.accent === "green"
                  ? "text-green"
                  : c.accent === "red"
                    ? "text-red"
                    : "text-muted"
              }`}
            >
              {c.sub}
            </div>
          </div>
        ))}
      </div>

      <section className="mb-6 rounded-xl border border-border bg-panel p-4">
        <h2 className="mb-3 text-sm font-semibold">Add positions</h2>
        <div className="flex flex-wrap items-end gap-2">
          <input
            className={`${inputCls} min-w-56 flex-1`}
            placeholder="Event — e.g. Bitcoin above $90,000 by Dec 31"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            list="arb-events"
          />
          <datalist id="arb-events">
            {rows.map((r) => (
              <option key={r.event} value={r.event} />
            ))}
          </datalist>
          <select
            className={inputCls}
            value={side}
            onChange={(e) => setSide(e.target.value as "yes" | "no")}
          >
            <option value="yes">YES</option>
            <option value="no">NO</option>
          </select>
          <input
            className={`${inputCls} w-24`}
            placeholder="Size"
            inputMode="decimal"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
          <input
            className={`${inputCls} w-24`}
            placeholder="Price (¢)"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <button
            onClick={add}
            className="rounded-lg bg-green-bg px-3 py-1.5 text-sm font-medium text-green transition-opacity hover:opacity-80"
          >
            + Add
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-text"
          >
            ⇪ CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onCsv(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className={`${inputCls} w-80 font-mono text-xs`}
            placeholder="0x… Polymarket wallet to import (public positions)"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
          />
          <button
            onClick={importWallet}
            disabled={busy}
            className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-text disabled:opacity-50"
          >
            {busy ? "Importing…" : "Import wallet"}
          </button>
          {positions.length > 0 && (
            <button
              onClick={() => portfolio.clearAll()}
              className="ml-auto rounded-lg px-3 py-1.5 text-sm text-red transition-opacity hover:opacity-80"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="mt-2 text-xs text-muted">
          CSV format: <code>event,side,size,price</code> (side = yes|no, price in
          0-1 or cents). Wallet import is read-only via Polymarket&apos;s public
          data API.
          {notice && <span className="ml-2 text-text">{notice}</span>}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Positions</h2>
          <span className="text-xs text-muted">
            Marked to {demo ? "demo" : "live"} Polymarket
          </span>
        </div>
        {marks.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            No positions yet — add one above or upload a CSV.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-muted">
                <th className="px-4 py-2.5">Event</th>
                <th className="px-4 py-2.5">Side</th>
                <th className="px-4 py-2.5 text-right">Size</th>
                <th className="px-4 py-2.5 text-right">Avg</th>
                <th className="px-4 py-2.5 text-right">Mark</th>
                <th className="px-4 py-2.5 text-right">P&amp;L</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {marks.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border-soft transition-colors hover:bg-[var(--hover)]"
                >
                  <td className="px-4 py-3">
                    <div className="max-w-72 truncate text-[13px] font-medium">
                      {p.event}
                    </div>
                    <div className="text-xs text-muted">{p.source}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${
                        p.side === "yes"
                          ? "bg-green-bg text-green"
                          : "bg-red-bg text-red"
                      }`}
                    >
                      {p.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums">
                    {fmt(p.size)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-muted">
                    {(p.avgPrice * 100).toFixed(1)}¢
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums">
                    {p.mark !== null ? `${(p.mark * 100).toFixed(1)}¢` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.pnlPct !== null ? (
                      <span
                        className={`rounded-md px-2 py-1 font-mono text-xs font-semibold ${
                          p.pnlPct >= 0
                            ? "bg-green-bg text-green"
                            : "bg-red-bg text-red"
                        }`}
                      >
                        {p.pnlPct >= 0 ? "+" : ""}
                        {(p.pnlPct * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => portfolio.removePosition(p.id)}
                      className="text-xs text-muted transition-colors hover:text-red"
                      title="Close position"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
