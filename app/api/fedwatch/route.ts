import { NextResponse } from "next/server";
import type { FedWatchData } from "@/lib/types";

export const runtime = "nodejs";

const CME_URL =
  "https://markets.api.cmegroup.com/fedwatch_rt/v1/forecasts/latest";

// CME FedWatch's official API appears to require a market-data license;
// this route serves demo values until resolved.
const DEMO: FedWatchData = {
  source: "demo",
  meetingDate: "2026-09-16",
  probabilities: [
    { label: "hold", probability: 0.65 },
    { label: "-25bp", probability: 0.3 },
    { label: "-50bp", probability: 0.05 },
  ],
};

export async function GET() {
  try {
    const res = await fetch(CME_URL, { next: { revalidate: 300, tags: ["arb-data"] } });
    if (!res.ok) throw new Error(`cme fedwatch ${res.status}`);
    const json = await res.json();
    return NextResponse.json({ source: "live", raw: json });
  } catch {
    return NextResponse.json(DEMO);
  }
}
