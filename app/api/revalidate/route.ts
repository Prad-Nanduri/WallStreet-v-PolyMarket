import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/revalidate — manual cache invalidation for demo purposes:
 * drops the 5-minute server cache shared by all external-data fetches so
 * the next /api/arbitrage poll hits fresh upstream data.
 */
export async function POST() {
  revalidateTag("arb-data", "max");
  return NextResponse.json({ revalidated: true, tag: "arb-data" });
}
