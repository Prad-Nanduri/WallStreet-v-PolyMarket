import type { DeribitSnapshot } from "@/lib/types";

const API = "https://www.deribit.com/api/v2/public";

interface BookSummary {
  instrument_name: string;
  mark_iv?: number;
  underlying_price?: number;
  estimated_delivery_price?: number;
}

/** BTC-USD index (spot). */
export async function fetchBtcSpot(): Promise<number> {
  const res = await fetch(`${API}/get_index_price?index_name=btc_usd`, {
    next: { revalidate: 300, tags: ["arb-data"] },
  });
  if (!res.ok) throw new Error(`deribit index ${res.status}`);
  const json = await res.json();
  const price = json?.result?.index_price;
  if (!Number.isFinite(price)) throw new Error("deribit index: no price");
  return price as number;
}

/** DVOL 30-day implied-vol index (latest daily close), percent. */
export async function fetchDvol(): Promise<number | null> {
  const end = Date.now();
  const start = end - 3 * 86_400_000;
  const res = await fetch(
    `${API}/get_volatility_index_data?currency=BTC&start_timestamp=${start}&end_timestamp=${end}&resolution=1D`,
    { next: { revalidate: 300, tags: ["arb-data"] } },
  );
  if (!res.ok) return null;
  const json = await res.json();
  const data = json?.result?.data as number[][] | undefined;
  const last = data?.[data.length - 1];
  // candles are [timestamp, open, high, low, close]
  return last && Number.isFinite(last[4]) ? last[4] : null;
}

interface ParsedInstrument {
  expiry: string; // e.g. 26SEP25
  expiryMs: number;
  strike: number;
  isCall: boolean;
  summary: BookSummary;
}

const INSTRUMENT_RE = /^BTC-(\d{1,2}[A-Z]{3}\d{2})-(\d+)-([CP])$/;

/** All live BTC option book summaries, parsed. */
async function fetchOptionSummaries(): Promise<ParsedInstrument[]> {
  const res = await fetch(
    `${API}/get_book_summary_by_currency?currency=BTC&kind=option`,
    { next: { revalidate: 300, tags: ["arb-data"] } },
  );
  if (!res.ok) throw new Error(`deribit book_summary ${res.status}`);
  const json = await res.json();
  const rows = (json?.result ?? []) as BookSummary[];
  const out: ParsedInstrument[] = [];
  for (const summary of rows) {
    const match = INSTRUMENT_RE.exec(summary.instrument_name);
    if (!match) continue;
    const expiryMs = Date.parse(match[1]);
    if (!Number.isFinite(expiryMs)) continue;
    out.push({
      expiry: match[1],
      expiryMs,
      strike: Number(match[2]),
      isCall: match[3] === "C",
      summary,
    });
  }
  return out;
}

/**
 * Snapshots of the call strike nearest current spot for each of the nearest
 * few expiries. markIv falls back to DVOL when a strike/expiry has no data.
 */
export async function fetchDeribitSnapshots(
  maxExpiries = 3,
): Promise<DeribitSnapshot[]> {
  const [spot, dvol, options] = await Promise.all([
    fetchBtcSpot(),
    fetchDvol(),
    fetchOptionSummaries(),
  ]);

  const now = Date.now();
  const byExpiry = new Map<number, ParsedInstrument[]>();
  for (const o of options) {
    if (!o.isCall || o.expiryMs <= now) continue;
    const list = byExpiry.get(o.expiryMs) ?? [];
    list.push(o);
    byExpiry.set(o.expiryMs, list);
  }

  const expiries = [...byExpiry.keys()].sort((a, b) => a - b);
  const snapshots: DeribitSnapshot[] = [];
  for (const expiryMs of expiries.slice(0, maxExpiries)) {
    const calls = byExpiry.get(expiryMs) ?? [];
    const nearest = calls.reduce<ParsedInstrument | null>(
      (best, o) =>
        best === null ||
        Math.abs(o.strike - spot) < Math.abs(best.strike - spot)
          ? o
          : best,
      null,
    );
    snapshots.push({
      strike: nearest?.strike ?? spot,
      expiryDate: new Date(expiryMs).toISOString().slice(0, 10),
      markIv: nearest?.summary.mark_iv ?? null,
      dvol,
      spotPrice: spot,
    });
  }
  return snapshots;
}
