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

  const rows = demo ? DEMO_ROWS : (data?.rows ?? []);
  return (
    <Ctx.Provider
      value={{ demo, setDemo, rows, loading: isLoading, error, refreshInterval }}
    >
      {children}
    </Ctx.Provider>
  );
}
