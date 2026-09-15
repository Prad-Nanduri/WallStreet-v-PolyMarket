import type { EventCategory, PolymarketMarket } from "@/lib/types";

// Sort by 24h volume desc — the default ordering is dominated by politics
// markets; this surfaces Fed/BTC/SPX financial markets on the first page.
const GAMMA_URL =
  "https://gamma-api.polymarket.com/markets?active=true&limit=100&order=volume24hr&ascending=false";
// Cap matches per category — politics markets dominate early pages, so a
// single global cap would starve btc/spx/fed of matches.
const MAX_PER_CATEGORY = 8;
// Wider net: extra keyword categories (sports/crypto/geo/misc) need more
// pages of gamma results before every bucket fills.
const MAX_PAGES = 20;

// Sports/crypto/geo/misc legs come from Kalshi (cross-venue), so only
// categories with a genuine second venue get keywords.
const CATEGORY_KEYWORDS: [EventCategory, RegExp][] = [
  ["fed", /\b(fed|fomc|interest rate(s)?|powell|rate(s)? cut|rate(s)? hike)\b/i],
  ["btc", /\b(btc|bitcoin)\b/i],
  ["crypto", /\b(eth|ethereum|solana|sol|xrp|doge|crypto)\b/i],
  ["spx", /\b(s&p|spx|s&p\s*500|nasdaq|stock market|dow jones)\b/i],
  [
    "sports",
    /\b(nfl|nba|nhl|mlb|super bowl|world cup|premier league|la liga|champions league|ufc|boxing|f1|formula 1|tennis|masters|stanley cup|epl|bundesliga|serie a|ligue 1|world series|finals|playoffs|ncaa|march madness|cricket|olympics)\b/i,
  ],
  [
    "geo",
    /\b(ukraine|russia|israel|gaza|iran|china|taiwan|ceasefire|war|nato|north korea|sanctions|invasion)\b/i,
  ],
  ["pol", /\b(president|election|nomination|electoral|senate|congress|mayor|governor|primary)\b/i],
  [
    "misc",
    /\b(oscar|grammy|emmy|box office|album|movie|weather|hurricane|temperature|ai |gpt|apple|tesla|spacex|spacex|musk)\b/i,
  ],
];

function categorize(question: string): EventCategory | null {
  for (const [category, re] of CATEGORY_KEYWORDS) {
    if (re.test(question)) return category;
  }
  return null;
}

// outcomePrices / outcomes / clobTokenIds arrive as JSON-encoded strings
// inside the JSON payload and need a second JSON.parse.
function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function fetchPolymarketMarkets(): Promise<PolymarketMarket[]> {
  const markets: PolymarketMarket[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(`${GAMMA_URL}&offset=${page * 100}`, {
      next: { revalidate: 300, tags: ["arb-data"] },
    });
    if (!res.ok) throw new Error(`polymarket gamma ${res.status}`);
    const raw = (await res.json()) as Record<string, unknown>[];
    if (raw.length === 0) break;
    collect(raw, markets);
    const counts = markets.reduce<Record<string, number>>((acc, m) => {
      acc[m.category] = (acc[m.category] ?? 0) + 1;
      return acc;
    }, {});
    if (Object.values(counts).every((n) => n >= MAX_PER_CATEGORY)) break;
  }
  return markets.sort((a, b) => b.volume - a.volume);
}

function collect(
  raw: Record<string, unknown>[],
  markets: PolymarketMarket[],
) {
  for (const m of raw) {
    const question = String(m.question ?? m.title ?? "");
    const category = categorize(question);
    if (!category) continue;
    if (
      markets.filter((x) => x.category === category).length >=
      MAX_PER_CATEGORY
    )
      continue;

    const prices = parseJsonArray(m.outcomePrices).map(Number);
    const outcomes = parseJsonArray(m.outcomes).map((o) =>
      String(o).toLowerCase(),
    );
    const yesIdx = outcomes.findIndex((o) => o === "yes");
    const yesProbability =
      yesIdx >= 0 && Number.isFinite(prices[yesIdx])
        ? (prices[yesIdx] as number)
        : Number.isFinite(prices[0])
          ? (prices[0] as number)
          : null;
    if (yesProbability === null) continue;

    markets.push({
      id: String(m.id ?? m.conditionId ?? question),
      question,
      category,
      yesProbability,
      volume: Number(m.volumeNum ?? m.volume ?? 0),
      endDate: String(m.endDateIso ?? m.endDate ?? ""),
    });
  }
}
