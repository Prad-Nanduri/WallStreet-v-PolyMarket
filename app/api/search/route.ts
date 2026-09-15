import { NextResponse } from "next/server";
import type { SearchRow } from "@/lib/types";
import {
  categorize,
  searchPolymarketMarkets,
} from "@/services/polymarket";
import {
  fetchKalshiGameMarkets,
  kalshiSportsPrice,
  searchKalshiEvents,
} from "@/services/kalshi";
import { fetchDeribitSnapshots } from "@/services/deribit";
import {
  cryptoProbability,
  spxProbability,
  type SnapshotWithMs,
} from "@/app/api/arbitrage/route";
import type {
  DeribitSnapshot,
  SpyOptionsData,
} from "@/lib/types";

export const runtime = "nodejs";
const MAX_ROWS = 40;

/**
 * On-demand topic search across both venues.
 * - Polymarket: /public-search (server-side search, real endpoint).
 * - Kalshi: no server-side search — open events are paged and matched
 *   locally on title tokens, plus the game/championship series.
 * Either leg can be absent; the cell then renders "no market".
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ rows: [] });

  const origin = new URL(req.url).origin;
  const withMs = (s: DeribitSnapshot[]): SnapshotWithMs[] =>
    s.map((x) => ({ ...x, expiryMsNum: Date.parse(x.expiryDate) }));
  const [poly, kalshiEvents, kalshiGames, btcSnaps, ethSnaps, spy] =
    await Promise.all([
      searchPolymarketMarkets(q).catch(() => []),
      searchKalshiEvents(q).catch(() => []),
      fetchKalshiGameMarkets().catch(() => []),
      fetchDeribitSnapshots("BTC")
        .then(withMs)
        .catch(() => [] as SnapshotWithMs[]),
      fetchDeribitSnapshots("ETH")
        .then(withMs)
        .catch(() => [] as SnapshotWithMs[]),
      fetch(`${origin}/api/spy-options`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null) as Promise<SpyOptionsData | null>,
    ]);

  const rows: SearchRow[] = [];
  const seen = new Set<string>();

  for (const m of poly.slice(0, 20)) {
    seen.add(m.question.toLowerCase());
    // Kalshi leg: explicit venue column. Options leg: Deribit / CBOE for
    // price-threshold markets — either can be absent.
    const sp = kalshiSportsPrice(m.question, kalshiGames);
    const kalshiHit = kalshiEvents.find((k) => {
      const a = k.title.toLowerCase();
      const b = m.question.toLowerCase();
      return a === b || a.includes(b) || b.includes(a);
    });
    const kalshiPct =
      (sp ? sp.prob : null) ??
      (kalshiHit?.yesPrice ?? null);

    let wall: { prob: number; source: string } | null = null;
    if (m.category === "btc") {
      const r = cryptoProbability(m, btcSnaps, "btc");
      if (r && !r.stale) wall = { prob: r.prob, source: "Deribit" };
    }
    if (m.category === "crypto") {
      const r = cryptoProbability(m, ethSnaps, "crypto");
      if (r && !r.stale) wall = { prob: r.prob, source: "Deribit" };
    }
    if (m.category === "spx" && spy) {
      const r = spxProbability(m, spy);
      if (r && !r.stale)
        wall = { prob: r.prob, source: spy.source === "demo" ? "SPY" : "CBOE" };
    }
    const endMs = Date.parse(m.endDate);
    const resolved =
      m.closed || (Number.isFinite(endMs) && endMs < Date.now());
    const polyPct = m.yesProbability * 100;
    const vs = wall ? wall.prob * 100 : kalshiPct;
    rows.push({
      event: m.question,
      category: m.category,
      polymarketPct: polyPct,
      kalshiPct: kalshiPct === null ? null : kalshiPct * 100,
      wallStreetPct: wall ? wall.prob * 100 : null,
      wallStreetSource: wall?.source,
      spread: vs === null ? null : polyPct - vs,
      status: resolved ? "resolved" : "live",
    });
  }

  for (const k of kalshiEvents) {
    if (seen.has(k.title.toLowerCase()) || rows.length >= MAX_ROWS) continue;
    rows.push({
      event: k.title,
      category: categorize(k.title) ?? "other",
      polymarketPct: null,
      kalshiPct: k.yesPrice === null ? null : k.yesPrice * 100,
      wallStreetPct: null,
      spread: null,
      status: "live", // Kalshi hits come from the status=open events feed
    });
  }

  // Live, tradable markets first — resolved 0%/100% rows sink to the end.
  rows.sort((a, b) => (a.status === b.status ? 0 : a.status === "live" ? -1 : 1));
  return NextResponse.json({ rows });
}
