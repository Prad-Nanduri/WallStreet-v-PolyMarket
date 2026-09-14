import type { EventCategory, PolymarketMarket } from "@/lib/types";

const GAMMA_URL =
  "https://gamma-api.polymarket.com/markets?active=true&limit=100";
// The default ordering is dominated by politics markets, so we page until
// we have collected enough fed/btc/spx matches (or run out of markets).
const MAX_PAGES = 10;
const MAX_MATCHES = 30;

const CATEGORY_KEYWORDS: [EventCategory, RegExp][] = [
  ["fed", /\b(fed|fomc|rate(s)?)\b/i],
  ["btc", /\b(btc|bitcoin)\b/i],
  ["spx", /\b(s&p|spx|s&p\s*500)\b/i],
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
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`polymarket gamma ${res.status}`);
    const raw = (await res.json()) as Record<string, unknown>[];
    if (raw.length === 0) break;
    collect(raw, markets);
    if (markets.length >= MAX_MATCHES) break;
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
