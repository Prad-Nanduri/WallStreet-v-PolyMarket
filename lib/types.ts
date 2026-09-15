export type EventCategory =
  | "fed"
  | "btc"
  | "spx"
  | "pol"
  | "sports"
  | "crypto"
  | "geo"
  | "misc";

export interface PolymarketMarket {
  id: string;
  question: string;
  category: EventCategory;
  /** implied probability of the "Yes" outcome, 0-1 */
  yesProbability: number;
  volume: number;
  endDate: string;
}

export interface DeribitSnapshot {
  strike: number;
  expiryDate: string;
  /** mark IV as a percent, e.g. 42.5 */
  markIv: number | null;
  /** DVOL index level (30-day IV), percent */
  dvol: number | null;
  spotPrice: number;
}

export interface FedWatchData {
  source: "live" | "demo";
  /** probabilities (0-1) keyed by outcome label */
  probabilities: { label: string; probability: number }[];
  meetingDate: string;
}

export interface SpyOptionsData {
  source: "live" | "demo";
  spotSpy: number;
  /** implied vol (decimal) for the strike nearest spot at nearest expiry */
  impliedVol: number | null;
  expiry: string | null;
}

export interface ArbitrageRow {
  event: string;
  category: EventCategory;
  polymarketPct: number;
  wallStreetPct: number;
  /** percentage points, polymarket - wall street */
  spread: number;
  isSignificant: boolean;
  /** true when any underlying source fell back to demo data */
  stale: boolean;
  /** which venue produced the Wall Street leg, e.g. "Deribit", "Kalshi", "FedWatch (demo)" */
  wallStreetSource?: string;
  /**
   * 7 daily spread points ending at today's value.
   * SIMULATED: deterministic random walk seeded from the event id — real
   * history requires the Redis snapshot pipeline (skipped: UPSTASH_* unset).
   */
  sparkline: number[];
}

/** A row from the on-demand topic search — unlike ArbitrageRow, either
 *  venue may simply have no market for the topic, so legs are nullable. */
export interface SearchRow {
  event: string;
  category: EventCategory | "other";
  /** percent 0-100, or null when Polymarket has no such market */
  polymarketPct: number | null;
  /** percent 0-100, or null when no Kalshi/options leg exists */
  wallStreetPct: number | null;
  wallStreetSource?: string;
  spread: number | null;
}
