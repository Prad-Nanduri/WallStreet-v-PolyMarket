import { NextResponse } from "next/server";
import type { SpyOptionsData } from "@/lib/types";

export const runtime = "nodejs";

const DEMO: SpyOptionsData = {
  source: "demo",
  spotSpy: 648.2,
  impliedVol: 0.16,
  expiry: "2026-12-18",
};

const CBOE_URL = "https://cdn.cboe.com/api/global/delayed_quotes/options/SPY.json";

// SPY spot/strikes are multiplied by 10 to approximate SPX — an
// approximation only: dividends and settlement timing differ from real SPX.
export async function GET() {
  try {
    // CBOE delayed-quotes JSON is free and unauthenticated — it just wants a
    // browser-ish UA + Referer. Yahoo's endpoint now 401s/429s, so this is
    // the live source; DEMO below is only a fallback on failure.
    const res = await fetch(CBOE_URL, {
      next: { revalidate: 300, tags: ["arb-data"] },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Referer: "https://www.cboe.com/",
      },
    });
    if (!res.ok) throw new Error(`cboe ${res.status}`);
    const json = await res.json();
    const data = json?.data;
    const spot = data?.current_price;
    // iv30 is CBOE's 30-day ATM implied vol — the right σ input for N(d2).
    const iv30 = data?.iv30;
    if (!Number.isFinite(spot) || !Number.isFinite(iv30) || iv30 <= 0) {
      throw new Error("no cboe spot/iv30");
    }
    const out: SpyOptionsData = {
      source: "live",
      spotSpy: spot,
      // CBOE reports IV as a percent (e.g. 13.35) — N(d2) needs a decimal.
      impliedVol: iv30 > 3 ? iv30 / 100 : iv30,
      expiry: null,
    };
    return NextResponse.json(out);
  } catch {
    return NextResponse.json(DEMO);
  }
}
