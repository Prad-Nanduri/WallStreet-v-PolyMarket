export type EventCategory = "fed" | "btc" | "spx";

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
}
