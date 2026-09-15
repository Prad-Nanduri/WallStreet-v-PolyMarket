import type { ArbitrageRow } from "@/lib/types";

export const DEMO_ROWS: ArbitrageRow[] = [
  {
    event: "Fed holds rates at September FOMC",
    category: "fed",
    polymarketPct: 68.0,
    wallStreetPct: 65.0,
    spread: 3.0,
    isSignificant: false,
    stale: false,
  },
  {
    event: "Bitcoin above $90,000 by Dec 31",
    category: "btc",
    polymarketPct: 62.0,
    wallStreetPct: 44.8,
    spread: 17.2,
    isSignificant: true,
    stale: false,
  },
  {
    event: "SPX above 6,600 by year-end",
    category: "spx",
    polymarketPct: 41.0,
    wallStreetPct: 38.4,
    spread: 2.6,
    isSignificant: false,
    stale: false,
  },
  {
    event: "Fed cuts 25bp at next meeting",
    category: "fed",
    polymarketPct: 27.5,
    wallStreetPct: 30.0,
    spread: -2.5,
    isSignificant: false,
    stale: false,
  },
];

export interface Holding {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  current: number;
}

export const DEMO_HOLDINGS: Holding[] = [
  { symbol: "AAPL", name: "Apple Inc.", shares: 1250, avgCost: 142.5, current: 178.25 },
  { symbol: "NVDA", name: "NVIDIA Corp.", shares: 450, avgCost: 285.0, current: 487.5 },
  { symbol: "MSFT", name: "Microsoft Corp.", shares: 800, avgCost: 310.25, current: 378.9 },
  { symbol: "GOOGL", name: "Alphabet Inc.", shares: 600, avgCost: 142.8, current: 138.45 },
  { symbol: "AMZN", name: "Amazon.com Inc.", shares: 550, avgCost: 145.2, current: 178.35 },
  { symbol: "TSLA", name: "Tesla Inc.", shares: 300, avgCost: 265.0, current: 248.5 },
];

export interface ActivityItem {
  side: "buy" | "sell";
  label: string;
  detail: string;
  when: string;
}

export const DEMO_ACTIVITY: ActivityItem[] = [
  { side: "buy", label: "Bought NVDA", detail: "50 shares @ $485.20", when: "2:34 PM" },
  { side: "sell", label: "Sold META", detail: "100 shares @ $512.40", when: "11:22 AM" },
  { side: "buy", label: "Bought AAPL", detail: "150 shares @ $176.85", when: "9:45 AM" },
  { side: "buy", label: "Bought MSFT", detail: "75 shares @ $377.20", when: "Yesterday" },
  { side: "sell", label: "Sold TSLA", detail: "50 shares @ $252.10", when: "Yesterday" },
];
