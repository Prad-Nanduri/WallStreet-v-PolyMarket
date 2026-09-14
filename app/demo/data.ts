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
