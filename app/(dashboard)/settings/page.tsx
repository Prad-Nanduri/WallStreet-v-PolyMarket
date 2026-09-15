"use client";

import { useSyncExternalStore } from "react";
import { useArbData } from "@/components/DataProvider";
import { portfolio, usePortfolio } from "@/lib/portfolio";

const getTheme = () =>
  document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
const getServerTheme = () => "dark";
const subTheme = (cb: () => void) => {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => obs.disconnect();
};

function setTheme(next: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* ignore */
  }
}

const selectCls =
  "rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-sm text-text";

export default function SettingsPage() {
  const theme = useSyncExternalStore(subTheme, getTheme, getServerTheme);
  const { demo, setDemo } = useArbData();
  const { positions } = usePortfolio();

  return (
    <main className="mx-auto max-w-3xl px-6 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Preferences persist to localStorage and apply across sessions.
        </p>
      </header>

      <section className="divide-y divide-border-soft rounded-xl border border-border bg-panel">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium">Appearance</div>
            <div className="text-xs text-muted">Light or dark theme.</div>
          </div>
          <select
            className={selectCls}
            value={theme}
            onChange={(e) => setTheme(e.target.value as "dark" | "light")}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium">Default data mode</div>
            <div className="text-xs text-muted">
              Applied to the dashboard on next load.
            </div>
          </div>
          <select
            className={selectCls}
            value={demo ? "demo" : "live"}
            onChange={(e) => {
              const live = e.target.value === "live";
              setDemo(!live);
              try {
                localStorage.setItem("arb_default_mode", e.target.value);
              } catch {
                /* ignore */
              }
            }}
          >
            <option value="demo">Demo data</option>
            <option value="live">Live data</option>
          </select>
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium">Live refresh interval</div>
            <div className="text-xs text-muted">
              SWR polling cadence for /api/arbitrage.
            </div>
          </div>
          <select
            className={selectCls}
            defaultValue="30000"
            onChange={(e) => {
              try {
                localStorage.setItem("arb_refresh_ms", e.target.value);
              } catch {
                /* ignore */
              }
            }}
          >
            <option value="10000">10s</option>
            <option value="30000">30s</option>
            <option value="60000">60s</option>
            <option value="300000">5m</option>
          </select>
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium">Portfolio data</div>
            <div className="text-xs text-muted">
              {positions.length} position{positions.length === 1 ? "" : "s"} +
              activity log stored in localStorage.
            </div>
          </div>
          <button
            className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-sm text-red transition-opacity hover:opacity-80"
            onClick={() => portfolio.clearAll()}
          >
            Clear
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="text-sm font-medium">Data sources</div>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            <li>· Polymarket — live (gamma-api, 5m cache)</li>
            <li>· Deribit — live (mark IV, DVOL fallback)</li>
            <li>· CME FedWatch — demo (upstream API requires a data license)</li>
            <li>· SPY/SPX options — live (CBOE delayed quotes, IV30)</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
