import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DATA_API = "https://data-api.polymarket.com/positions";

interface WalletPosition {
  title?: string;
  outcome?: string;
  size?: number;
  avgPrice?: number;
  curPrice?: number;
  cashPnl?: number;
  currentValue?: number;
}

/**
 * GET /api/wallet?wallet=0x...
 * Read-only import of public Polymarket positions for a proxy wallet —
 * Polymarket's data-api exposes positions without auth (no private CLOB
 * credentials needed). CORS-safe via this server-side proxy.
 */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet") ?? "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json(
      { error: "wallet must be a 0x-prefixed 40-hex-char address" },
      { status: 400 },
    );
  }
  try {
    const res = await fetch(`${DATA_API}?user=${wallet}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`polymarket data-api ${res.status}`);
    const raw = (await res.json()) as WalletPosition[];
    const positions = (Array.isArray(raw) ? raw : [])
      .filter((p) => p.title && typeof p.size === "number" && p.size > 0)
      .map((p) => ({
        event: p.title as string,
        side: String(p.outcome ?? "Yes").toLowerCase() === "no" ? "no" : "yes",
        size: p.size as number,
        avgPrice: typeof p.avgPrice === "number" ? p.avgPrice : null,
        curPrice: typeof p.curPrice === "number" ? p.curPrice : null,
        cashPnl: typeof p.cashPnl === "number" ? p.cashPnl : null,
        currentValue:
          typeof p.currentValue === "number" ? p.currentValue : null,
      }));
    return NextResponse.json({ positions, source: "live" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "wallet fetch failed" },
      { status: 502 },
    );
  }
}
