const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";
const MAX_PAGES = 8;

export interface KalshiMarket {
  title: string;
  /** best available yes-price estimate 0-1 (mid of bid/ask, else last) */
  yesPrice: number | null;
}

const STOP = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "for",
  "by",
  "at",
  "will",
  "be",
  "is",
  "win",
  "wins",
  "or",
  "and",
  "vs",
]);

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9$% ]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );
}

/** Jaccard similarity on content tokens. */
function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter += 1;
  });
  return inter / (ta.size + tb.size - inter);
}

// Conservative bar — wrong pairings are worse than no match.
const MATCH_MIN = 0.45;

export async function fetchKalshiMarkets(): Promise<KalshiMarket[]> {
  const out: KalshiMarket[] = [];
  let cursor = "";
  for (let i = 0; i < MAX_PAGES; i++) {
    const url = `${KALSHI_BASE}/markets?status=open&limit=200${cursor ? `&cursor=${cursor}` : ""}`;
    const res = await fetch(url, {
      next: { revalidate: 300, tags: ["arb-data"] },
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`kalshi ${res.status}`);
    const json = await res.json();
    const ms = (json?.markets ?? []) as Record<string, unknown>[];
    for (const m of ms) {
      const title = String(m.title ?? "");
      if (!title || title.startsWith("yes ") || title.startsWith("no ")) continue;
      const bid = Number(m.yes_bid_dollars);
      const ask = Number(m.yes_ask_dollars);
      const last = Number(m.last_price_dollars);
      let yesPrice: number | null = null;
      if (Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0 && ask >= bid) {
        yesPrice = (bid + ask) / 2;
      } else if (Number.isFinite(last) && last > 0) {
        yesPrice = last;
      }
      if (yesPrice === null) continue;
      out.push({ title, yesPrice });
    }
    cursor = String(json?.cursor ?? "");
    if (!cursor || ms.length === 0) break;
  }
  return out;
}

/** Best Kalshi yes-price for a Polymarket question, or null when no title
 *  clears the similarity bar. */
export function kalshiPriceFor(
  question: string,
  kalshi: KalshiMarket[],
): { prob: number; match: string } | null {
  let best: KalshiMarket | null = null;
  let bestScore = MATCH_MIN;
  for (const k of kalshi) {
    const s = similarity(question, k.title);
    if (s > bestScore) {
      bestScore = s;
      best = k;
    }
  }
  if (!best || best.yesPrice === null) return null;
  return { prob: best.yesPrice, match: best.title };
}
