"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import useSWR from "swr";
import type { ArbitrageRow } from "@/lib/types";
import { DEMO_ROWS } from "@/app/demo/data";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    return r.json();
  });

interface ArbData {
  demo: boolean;
  setDemo: (d: boolean) => void;
  rows: ArbitrageRow[];
  loading: boolean;
  error: unknown;
  refreshInterval: number;
}

const Ctx = createContext<ArbData | null>(null);

export function useArbData(): ArbData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useArbData outside DataProvider");
  return v;
}

// Manual FedWatch overrides: licensed users can paste their own CME
// FedWatch probabilities in Settings; stored as {"keyword": pct} JSON.
function loadFedOverrides(): [string, number][] {
  try {
    const raw = localStorage.getItem("wsp_fedwatch_override");
    if (!raw) return [];
    const obj = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(obj)
      .filter(([, v]) => Number.isFinite(Number(v)))
      .map(([k, v]) => [k.toLowerCase(), Number(v) / 100]);
  } catch {
    return [];
  }
}

export function applyFedOverrides(rows: ArbitrageRow[]): ArbitrageRow[] {
  if (typeof window === "undefined") return rows;
  const overrides = loadFedOverrides();
  if (!overrides.length) return rows;
  return rows.map((row) => {
    if (row.category !== "fed") return row;
    const q = row.event.toLowerCase();
    const hit = overrides.find(([k]) => q.includes(k));
    if (!hit) return row;
    const wallStreetPct = hit[1] * 100;
    const spread = row.polymarketPct - wallStreetPct;
    return {
      ...row,
      wallStreetPct,
      spread,
      isSignificant: Math.abs(spread) > 10,
      stale: false,
      wallStreetSource: "FedWatch (manual)",
    };
  });
}

export default function DataProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30_000);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        if (localStorage.getItem("arb_default_mode") === "live") setDemo(false);
        const ri = Number(localStorage.getItem("arb_refresh_ms"));
        if (Number.isFinite(ri) && ri >= 5000) setRefreshInterval(ri);
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const { data, error, isLoading } = useSWR<{ rows: ArbitrageRow[] }>(
    demo ? null : "/api/arbitrage",
    fetcher,
    { refreshInterval },
  );

  const rows = applyFedOverrides(demo ? DEMO_ROWS : (data?.rows ?? []));
  return (
    <Ctx.Provider
      value={{ demo, setDemo, rows, loading: isLoading, error, refreshInterval }}
    >
      {children}
    </Ctx.Provider>
  );
}
