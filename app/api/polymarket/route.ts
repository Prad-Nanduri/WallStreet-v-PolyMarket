import { NextResponse } from "next/server";
import { fetchPolymarketMarkets } from "@/services/polymarket";

export const runtime = "nodejs";

export async function GET() {
  try {
    const markets = await fetchPolymarketMarkets();
    return NextResponse.json({ source: "live", markets });
  } catch (err) {
    return NextResponse.json(
      { source: "error", markets: [], error: String(err) },
      { status: 502 },
    );
  }
}
