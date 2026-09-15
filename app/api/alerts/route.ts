import { NextResponse } from "next/server";
import type { ArbitrageRow } from "@/lib/types";

export const runtime = "nodejs";

// In-memory rate limiter: one alert per event per day per server instance.
// Sufficient for MVP — swap for Redis if UPSTASH_* env vars are ever set.
const alertedAt = new Map<string, number>();
const DAY_MS = 86_400_000;

function signature(event: string, direction: number): string {
  return `${event}|${direction}`;
}

/**
 * POST { rows: ArbitrageRow[] } — posts to ALERT_WEBHOOK_URL (Slack or
 * Discord incoming-webhook format) for each spread crossing ±10pp.
 * No-ops entirely when the env var is absent.
 */
export async function POST(req: Request) {
  const webhook = process.env.ALERT_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json({ sent: 0, reason: "ALERT_WEBHOOK_URL unset" });
  }

  const { rows } = (await req.json()) as { rows?: ArbitrageRow[] };
  const now = Date.now();
  const fired: string[] = [];

  for (const row of rows ?? []) {
    if (!row.isSignificant) continue;
    const sig = signature(row.event, Math.sign(row.spread));
    if (now - (alertedAt.get(sig) ?? 0) < DAY_MS) continue;

    const text =
      `:rotating_light: *${row.event}* — spread ${row.spread > 0 ? "+" : ""}` +
      `${row.spread.toFixed(1)}pp (Polymarket ${row.polymarketPct.toFixed(1)}% ` +
      `vs Wall St ${row.wallStreetPct.toFixed(1)}%)`;
    const body = webhook.includes("discord")
      ? { content: text }
      : { text }; // Slack incoming webhook

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      alertedAt.set(sig, now);
      fired.push(row.event);
    }
  }

  return NextResponse.json({ sent: fired.length, events: fired });
}
