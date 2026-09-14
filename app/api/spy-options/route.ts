import { NextResponse } from "next/server";
import type { SpyOptionsData } from "@/lib/types";

export const runtime = "nodejs";

const DEMO: SpyOptionsData = {
  source: "demo",
  spotSpy: 648.2,
  impliedVol: 0.16,
  expiry: "2026-12-18",
};

// SPY spot/strikes are multiplied by 10 to approximate SPX — an
// approximation only: dividends and settlement timing differ from real SPX.
export async function GET() {
  try {
    const res = await fetch(
      "https://query2.finance.yahoo.com/v7/finance/options/SPY",
      {
        next: { revalidate: 300 },
        headers: { "User-Agent": "Mozilla/5.0" },
      },
    );
    if (!res.ok) throw new Error(`yahoo ${res.status}`);
    const json = await res.json();
    const result = json?.optionChain?.result?.[0];
    const spot = result?.quote?.regularMarketPrice;
    const expirations: number[] = result?.expirationDates ?? [];
    const expiryTs = expirations.find((t) => t * 1000 > Date.now());
    if (!Number.isFinite(spot) || !expiryTs) throw new Error("no chain");

    const chainRes = await fetch(
      `https://query2.finance.yahoo.com/v7/finance/options/SPY?date=${expiryTs}`,
      {
        next: { revalidate: 300 },
        headers: { "User-Agent": "Mozilla/5.0" },
      },
    );
    if (!chainRes.ok) throw new Error(`yahoo chain ${chainRes.status}`);
    const chainJson = await chainRes.json();
    const calls =
      chainJson?.optionChain?.result?.[0]?.options?.[0]?.calls ?? [];
    const nearest = calls.reduce(
      (best: { strike: number; impliedVolatility?: number } | null, c: {
        strike: number;
        impliedVolatility?: number;
      }) =>
        best === null ||
        Math.abs(c.strike - spot) < Math.abs(best.strike - spot)
          ? c
          : best,
      null,
    );

    const data: SpyOptionsData = {
      source: "live",
      spotSpy: spot,
      impliedVol: nearest?.impliedVolatility ?? null,
      expiry: new Date(expiryTs * 1000).toISOString().slice(0, 10),
    };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(DEMO);
  }
}
