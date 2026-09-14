import { NextResponse } from "next/server";
import { fetchDeribitSnapshots } from "@/services/deribit";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshots = await fetchDeribitSnapshots();
    return NextResponse.json({ source: "live", snapshots });
  } catch (err) {
    return NextResponse.json(
      { source: "error", snapshots: [], error: String(err) },
      { status: 502 },
    );
  }
}
