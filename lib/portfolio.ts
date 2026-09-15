"use client";

import { useSyncExternalStore } from "react";

export interface Position {
  id: string;
  /** market question / event title */
  event: string;
  /** which side of the binary market is held */
  side: "yes" | "no";
  /** contracts/shares held */
  size: number;
  /** average entry price per contract, in 0-1 probability space */
  avgPrice: number;
  addedAt: number;
  source: "manual" | "csv" | "wallet";
}

export interface Activity {
  id: string;
  ts: number;
  side: "buy" | "sell";
  label: string;
  detail: string;
}

interface PortfolioState {
  positions: Position[];
  activity: Activity[];
}

const EMPTY: PortfolioState = { positions: [], activity: [] };
const POSITIONS_KEY = "wsp_positions";
const ACTIVITY_KEY = "wsp_activity";

let state: PortfolioState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): PortfolioState {
  if (!loaded) {
    loaded = true;
    try {
      const positions = JSON.parse(
        localStorage.getItem(POSITIONS_KEY) ?? "[]",
      ) as Position[];
      const activity = JSON.parse(
        localStorage.getItem(ACTIVITY_KEY) ?? "[]",
      ) as Activity[];
      state = {
        positions: Array.isArray(positions) ? positions : [],
        activity: Array.isArray(activity) ? activity : [],
      };
    } catch {
      state = EMPTY;
    }
  }
  return state;
}

function persist(next: PortfolioState) {
  state = next;
  try {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(next.positions));
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next.activity));
  } catch {
    /* storage unavailable — keep in-memory state */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function logActivity(a: Omit<Activity, "id" | "ts">) {
  return { ...a, id: uid(), ts: Date.now() };
}

export const portfolio = {
  addPosition(p: Omit<Position, "id" | "addedAt">) {
    const cur = load();
    const pos: Position = { ...p, id: uid(), addedAt: Date.now() };
    persist({
      positions: [...cur.positions, pos],
      activity: [
        logActivity({
          side: "buy",
          label: `Added ${p.event}`,
          detail: `${p.size} ${p.side.toUpperCase()} @ ${(p.avgPrice * 100).toFixed(1)}¢`,
        }),
        ...cur.activity,
      ],
    });
  },

  importPositions(ps: Omit<Position, "id" | "addedAt">[], label: string) {
    const cur = load();
    const now = Date.now();
    persist({
      positions: [
        ...cur.positions,
        ...ps.map((p) => ({ ...p, id: uid(), addedAt: now })),
      ],
      activity: [
        logActivity({
          side: "buy",
          label,
          detail: `${ps.length} position${ps.length === 1 ? "" : "s"}`,
        }),
        ...cur.activity,
      ],
    });
  },

  removePosition(id: string) {
    const cur = load();
    const gone = cur.positions.find((p) => p.id === id);
    persist({
      positions: cur.positions.filter((p) => p.id !== id),
      activity: gone
        ? [
            logActivity({
              side: "sell",
              label: `Closed ${gone.event}`,
              detail: `${gone.size} ${gone.side.toUpperCase()} @ ${(gone.avgPrice * 100).toFixed(1)}¢ entry`,
            }),
            ...cur.activity,
          ]
        : cur.activity,
    });
  },

  clearAll() {
    persist(EMPTY);
  },
};

/** Parses "event,side,size,price" lines; price may be 0-1 or cents (0-100). */
export function parsePositionsCsv(text: string): Omit<Position, "id" | "addedAt" | "source">[] {
  const out: Omit<Position, "id" | "addedAt" | "source">[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^event\s*,/i.test(trimmed)) continue;
    const cols = trimmed.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) =>
      c.trim().replace(/^"|"$/g, ""),
    );
    if (cols.length < 4) continue;
    const side = cols[1].toLowerCase();
    if (side !== "yes" && side !== "no") continue;
    const size = Number(cols[2]);
    let price = Number(cols[3]);
    if (!Number.isFinite(size) || !Number.isFinite(price) || size <= 0) continue;
    if (price > 1) price /= 100;
    if (price <= 0 || price >= 1) continue;
    out.push({ event: cols[0], side, size, avgPrice: price });
  }
  return out;
}

export function usePortfolio(): PortfolioState {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}
