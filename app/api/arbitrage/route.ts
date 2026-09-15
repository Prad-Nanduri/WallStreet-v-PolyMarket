import { NextResponse } from "next/server";
import { binaryCallProbability } from "@/lib/black-scholes";
import type {
  ArbitrageRow,
  DeribitSnapshot,
  FedWatchData,
  PolymarketMarket,
  SpyOptionsData,
} from "@/lib/types";
import { fetchPolymarketMarkets } from "@/services/polymarket";
import { fetchDeribitSnapshots } from "@/services/deribit";
import { fetchKalshiMarkets, kalshiPriceFor } from "@/services/kalshi";
import { seededSpreadHistory } from "@/lib/sparkline";

export const runtime = "nodejs";

const YEAR_MS = 365.25 * 24 * 3600 * 1000;
const MAX_PER_CATEGORY = 3;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return (await res.json()) as T;
}

/** Largest dollar/threshold number in a question ("$100,000", "100k", "6,600"). */
export function extractThreshold(question: string): number | null {
  const re = /\$?\s?([\d][\d,]*(?:\.\d+)?)\s?([kKmM])?\b/g;
  let best: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(question))) {
    let v = parseFloat(m[1].replace(/,/g, ""));
    if (!Number.isFinite(v)) continue;
    const mult = m[2]?.toLowerCase();
    if (mult === "k") v *= 1e3;
    if (mult === "m") v *= 1e6;
    if (v >= 100 && (best === null || v > best)) best = v;
  }
  return best;
}

const PRICE_PHRASING =
  /\b(hit|reach|above|over|exceed|below|under|close|finish|end)\b|\$/i;

/** Plausible threshold ranges so stray numbers (years, counts) are ignored. */
const K_RANGE: Record<"btc" | "spx", [number, number]> = {
  btc: [20_000, 1_000_000],
  spx: [1_000, 50_000],
};

function priceThreshold(
  question: string,
  category: "btc" | "spx",
): number | null {
  if (!PRICE_PHRASING.test(question)) return null;
  const K = extractThreshold(question);
  if (K === null) return null;
  const [lo, hi] = K_RANGE[category];
  return K >= lo && K <= hi ? K : null;
}

/** Question asks about S_T < K rather than S_T >= K. */
function isDownside(question: string): boolean {
  return /\b(below|under|drops?|falls?|dips?|crash)\b/i.test(question);
}

function fedProbability(
  market: PolymarketMarket,
  fedwatch: FedWatchData,
): { prob: number; stale: boolean } | null {
  const q = market.question.toLowerCase();
  // Only meeting-decision phrasing maps onto next-meeting outcome buckets;
  // "N rate cuts in YYYY" count markets and bound-level markets do not.
  const eligible =
    /(fomc|emergency|rate\s+decision|fed\s+decision|interest\s+rate\s+decision|holds?\s+rates?|cuts?\s+rates?|hikes?\s+rates?|raises?\s+rates?)/i.test(
      q,
    ) && !/(bound|or more|\d+\s+(fed\s+)?rate\s+cuts?)/i.test(q);
  if (!eligible) return null;
  const find = (label: string) =>
    fedwatch.probabilities.find((p) => p.label === label)?.probability;
  let prob: number | undefined;
  if (/50\s?bp|emergency/.test(q) && /cut|lower|decrease|ease/.test(q)) {
    prob = find("-50bp");
  } else if (/cut|lower|decrease|ease/.test(q)) {
    prob = find("-25bp");
  } else if (/hold|unchanged|no change|keep|paus/.test(q)) {
    prob = find("hold");
  } else if (/hike|raise|increase|tighten/.test(q)) {
    prob = Math.max(
      0,
      1 - fedwatch.probabilities.reduce((s, p) => s + p.probability, 0),
    );
  }
  if (prob === undefined) {
    prob = Math.max(...fedwatch.probabilities.map((p) => p.probability));
  }
  return { prob, stale: fedwatch.source === "demo" };
}

/**
 * Politics/election events have no options-market equivalent, so there is
 * no model price to compare against — use a flat 50% prior marked stale.
 */
function polProbability(): { prob: number; stale: boolean } {
  return { prob: 0.5, stale: true };
}

interface SnapshotWithMs extends DeribitSnapshot {
  expiryMsNum: number;
}

function btcProbability(
  market: PolymarketMarket,
  snapshots: SnapshotWithMs[],
): { prob: number; stale: boolean } | null {
  const K = priceThreshold(market.question, "btc");
  if (K === null || snapshots.length === 0) return null;
  const endMs = Date.parse(market.endDate);
  const snap = Number.isFinite(endMs)
    ? snapshots.reduce((a, b) =>
        Math.abs(b.expiryMsNum - endMs) < Math.abs(a.expiryMsNum - endMs)
          ? b
          : a,
      )
    : snapshots[0];
  const sigmaPct = snap.markIv ?? snap.dvol;
  if (sigmaPct === null || sigmaPct === undefined) return null;
  const T = Number.isFinite(endMs)
    ? Math.max((endMs - Date.now()) / YEAR_MS, 1 / 365)
    : Math.max((snap.expiryMsNum - Date.now()) / YEAR_MS, 1 / 365);
  // r hardcoded at 4% — should eventually come from a Treasury-yield source.
  let p = binaryCallProbability({
    S: snap.spotPrice,
    K,
    T,
    r: 0.04,
    sigma: sigmaPct / 100,
  });
  if (isDownside(market.question)) p = 1 - p;
  return { prob: p, stale: false };
}

function spxProbability(
  market: PolymarketMarket,
  spy: SpyOptionsData,
): { prob: number; stale: boolean } | null {
  const K = priceThreshold(market.question, "spx");
  if (K === null || spy.impliedVol === null) return null;
  const endMs = Date.parse(market.endDate);
  const T = Number.isFinite(endMs)
    ? Math.max((endMs - Date.now()) / YEAR_MS, 1 / 365)
    : spy.expiry
      ? Math.max((Date.parse(spy.expiry) - Date.now()) / YEAR_MS, 1 / 365)
      : 30 / 365;
  // SPY * 10 approximates SPX (approximation only — dividends/timing differ).
  let p = binaryCallProbability({
    S: spy.spotSpy * 10,
    K,
    T,
    r: 0.04,
    sigma: spy.impliedVol,
  });
  if (isDownside(market.question)) p = 1 - p;
  return { prob: p, stale: spy.source === "demo" };
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const [markets, snapshots, fedwatch, spy, kalshiMarkets] = await Promise.all([
    fetchPolymarketMarkets().catch(() => [] as PolymarketMarket[]),
    fetchDeribitSnapshots()
      .then((s) =>
        s.map<SnapshotWithMs>((x) => ({
          ...x,
          expiryMsNum: Date.parse(x.expiryDate),
        })),
      )
      .catch(() => [] as SnapshotWithMs[]),
    getJson<FedWatchData>(`${origin}/api/fedwatch`).catch(
      () =>
        ({
          source: "demo",
          meetingDate: "",
          probabilities: [{ label: "hold", probability: 0.5 }],
        }) satisfies FedWatchData,
    ),
    getJson<SpyOptionsData>(`${origin}/api/spy-options`).catch(
      () =>
        ({
          source: "demo",
          spotSpy: 648.2,
          impliedVol: 0.16,
          expiry: null,
        }) satisfies SpyOptionsData,
    ),
    fetchKalshiMarkets().catch(() => []),
  ]);

  const rows: ArbitrageRow[] = [];
  const counts = { fed: 0, btc: 0, spx: 0, pol: 0 };
  for (const market of markets) {
    if (counts[market.category] >= MAX_PER_CATEGORY) continue;
    let result: { prob: number; stale: boolean; source: string } | null =
      null;
    const withSource = (
      r: { prob: number; stale: boolean } | null,
      source: string,
    ) => (r ? { ...r, source } : null);
    const kalshi = kalshiPriceFor(market.question, kalshiMarkets);
    if (market.category === "fed")
      // Prefer a live Kalshi market price when a matching Fed market exists;
      // otherwise the FedWatch leg (demo until CME licensing is resolved).
      result = kalshi
        ? { prob: kalshi.prob, stale: false, source: "Kalshi" }
        : withSource(
            fedProbability(market, fedwatch),
            fedwatch.source === "demo" ? "FedWatch (demo)" : "FedWatch",
          );
    if (market.category === "btc")
      result = withSource(btcProbability(market, snapshots), "Deribit");
    if (market.category === "spx")
      result = withSource(
        spxProbability(market, spy),
        spy.source === "demo" ? "SPY (demo)" : "CBOE",
      );
    if (market.category === "pol")
      // Cross-venue arbitrage: a Kalshi twin market is a real live
      // comparison; fall back to the flat 50% demo prior when none matches.
      result = kalshi
        ? { prob: kalshi.prob, stale: false, source: "Kalshi" }
        : { ...polProbability(), source: "50% prior" };
    if (!result) continue;

    const polymarketPct = market.yesProbability * 100;
    const wallStreetPct = result.prob * 100;
    const spread = polymarketPct - wallStreetPct;
    rows.push({
      event: market.question,
      category: market.category,
      polymarketPct,
      wallStreetPct,
      spread,
      // Only flag rows where BOTH legs are live — a demo prior is a
      // placeholder, not a mispricing, and would spam alerts.
      isSignificant: !result.stale && Math.abs(spread) > 10,
      stale: result.stale,
      wallStreetSource: result.source,
      sparkline: seededSpreadHistory(market.id, spread),
    });
    counts[market.category] += 1;
  }

  rows.sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread));
  // Fire-and-forget: no-ops unless ALERT_WEBHOOK_URL is configured.
  fetch(`${origin}/api/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  }).catch(() => {});
  return NextResponse.json({ rows });
}
