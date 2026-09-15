const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";
const MAX_PAGES = 8;

export interface KalshiMarket {
  title: string;
  /** best available yes-price estimate 0-1 (mid of bid/ask, else last) */
  yesPrice: number | null;
}

/** Nested outcome market inside a Kalshi event (e.g. "KC Chiefs" in KXNFLGAME). */
export interface KalshiGameMarket {
  /** outcome name, e.g. "KC Chiefs" or "Denver Broncos" */
  title: string;
  /** parent event title, e.g. "IND Colts vs KC Chiefs" */
  event: string;
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

export interface KalshiSearchHit {
  /** event title, used as the row's event label */
  title: string;
  yesPrice: number | null;
}

const SEARCH_EVENT_PAGES = 12;

/** Text search over Kalshi events: paginate open events and keep those
 *  whose title shares every content token with the query. Kalshi has no
 *  server-side search, so matching is done locally over event titles. */
export async function searchKalshiEvents(q: string): Promise<KalshiSearchHit[]> {
  const qToks = tokens(q);
  if (qToks.size === 0) return [];
  const hits: KalshiSearchHit[] = [];
  let cursor = "";
  for (let i = 0; i < SEARCH_EVENT_PAGES; i++) {
    const url = `${KALSHI_BASE}/events?status=open&limit=100&with_nested_markets=true${cursor ? `&cursor=${cursor}` : ""}`;
    const res = await fetch(url, {
      next: { revalidate: 60, tags: ["arb-data"] },
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`kalshi events ${res.status}`);
    const json = await res.json();
    for (const ev of (json?.events ?? []) as Record<string, unknown>[]) {
      const evTitle = String(ev.title ?? "");
      if (!evTitle) continue;
      const evToks = tokens(evTitle);
      let all = true;
      qToks.forEach((t) => {
        if (!evToks.has(t)) all = false;
      });
      if (!all) continue;
      // Representative price: the nested market with the highest yes
      // ask — nearest to the headline outcome.
      let best: number | null = null;
      for (const m of (ev.markets ?? []) as Record<string, unknown>[]) {
        const p = marketYesPrice(m);
        if (p !== null && (best === null || p > best)) best = p;
      }
      hits.push({ title: evTitle, yesPrice: best });
    }
    cursor = String(json?.cursor ?? "");
    if (!cursor || (json?.events ?? []).length === 0) break;
  }
  return hits;
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

// Series tickers whose nested markets are per-team/per-outcome prices.
const GAME_SERIES = [
  "KXNFLGAME",
  "KXNBAGAME",
  "KXMLBGAME",
  "KXEPLGAME",
  "KXSB", // championship futures ("2027 Pro Football Champion")
];

function marketYesPrice(m: Record<string, unknown>): number | null {
  const bid = Number(m.yes_bid_dollars);
  const ask = Number(m.yes_ask_dollars);
  const last = Number(m.last_price_dollars);
  if (
    Number.isFinite(bid) &&
    Number.isFinite(ask) &&
    bid > 0 &&
    ask > 0 &&
    ask >= bid
  )
    return (bid + ask) / 2;
  if (Number.isFinite(last) && last > 0) return last;
  return null;
}

/** Nested markets (one per team/outcome) across the sports/game series. */
export async function fetchKalshiGameMarkets(): Promise<KalshiGameMarket[]> {
  const out: KalshiGameMarket[] = [];
  for (const series of GAME_SERIES) {
    try {
      const url = `${KALSHI_BASE}/events?series_ticker=${series}&status=open&limit=100&with_nested_markets=true`;
      const res = await fetch(url, {
        next: { revalidate: 300, tags: ["arb-data"] },
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!res.ok) continue;
      const json = await res.json();
      for (const ev of (json?.events ?? []) as Record<string, unknown>[]) {
        const evTitle = String(ev.title ?? "");
        for (const m of (ev.markets ?? []) as Record<string, unknown>[]) {
          const title = String(m.title ?? "");
          if (!title || title.startsWith("yes ") || title.startsWith("no "))
            continue;
          out.push({ title, event: evTitle, yesPrice: marketYesPrice(m) });
        }
      }
    } catch {
      /* series absent or request failed — skip */
    }
  }
  return out;
}

// City abbreviations Kalshi uses vs the names Polymarket spells out.
const TEAM_ALIASES: Record<string, string> = {
  kc: "kansas city",
  ny: "new york",
  la: "los angeles",
  sf: "san francisco",
  lv: "las vegas",
  tb: "tampa bay",
  gb: "green bay",
  ne: "new england",
  no: "new orleans",
  was: "washington",
  det: "detroit",
  buf: "buffalo",
  car: "carolina",
  cin: "cincinnati",
  cle: "cleveland",
  min: "minnesota",
  chi: "chicago",
  bal: "baltimore",
  phi: "philadelphia",
  ten: "tennessee",
  pit: "pittsburgh",
  jac: "jacksonville",
  den: "denver",
  mia: "miami",
  sea: "seattle",
  ari: "arizona",
  dal: "dallas",
  ind: "indianapolis",
  atl: "atlanta",
  hou: "houston",
  lac: "los angeles",
  lar: "los angeles",
  nyj: "new york",
  nyg: "new york",
};

function sportTokens(s: string): Set<string> {
  const toks = s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .flatMap((t) => (TEAM_ALIASES[t] ? TEAM_ALIASES[t].split(" ") : [t]))
    .filter((t) => t.length > 2 && !STOP.has(t));
  return new Set(toks);
}

/** Sports price: match a Kalshi game/championship market whose outcome
 *  tokens (e.g. "broncos") all appear in the Polymarket question. Returns
 *  the match with the most outcome tokens (most specific). */
export function kalshiSportsPrice(
  question: string,
  games: KalshiGameMarket[],
): { prob: number; match: string } | null {
  const q = sportTokens(question);
  let best: { prob: number; match: string } | null = null;
  let bestSize = 0;
  for (const g of games) {
    if (g.yesPrice === null) continue;
    const gt = sportTokens(g.title);
    if (gt.size === 0) continue;
    let all = true;
    gt.forEach((t) => {
      if (!q.has(t)) all = false;
    });
    // Nickname alone is enough ("broncos" ⊂ question); ambiguous single
    // city tokens ("boston") still require the whole outcome name.
    if (all && gt.size > bestSize) {
      bestSize = gt.size;
      best = { prob: g.yesPrice, match: `${g.event}: ${g.title}` };
    }
  }
  return best;
}
