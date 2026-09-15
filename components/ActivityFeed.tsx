"use client";

import { usePortfolio } from "@/lib/portfolio";
import { DEMO_ACTIVITY, type ActivityItem } from "@/app/demo/data";

function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d}d ago`;
}

/**
 * Real activity log from the local portfolio store; falls back to the demo
 * feed when the user hasn't recorded any actions yet.
 */
export default function ActivityFeed({ large = false }: { large?: boolean }) {
  const { activity } = usePortfolio();
  const items: ActivityItem[] =
    activity.length > 0
      ? activity.map((a) => ({
          side: a.side,
          label: a.label,
          detail: a.detail,
          when: relTime(a.ts),
        }))
      : DEMO_ACTIVITY;

  return (
    <ul>
      {items.map((a, i) => (
        <li
          key={i}
          className="flex items-center gap-3 border-t border-border-soft px-4 py-3 first:border-t-0 transition-colors hover:bg-[var(--hover)]"
        >
          <span
            className={`flex shrink-0 items-center justify-center rounded-md ${
              large ? "h-8 w-8 text-sm" : "h-7 w-7 text-xs"
            } ${a.side === "buy" ? "bg-green-bg text-green" : "bg-red-bg text-red"}`}
          >
            {a.side === "buy" ? "↑" : "↓"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{a.label}</div>
            <div className="truncate text-xs text-muted">{a.detail}</div>
          </div>
          {large && (
            <span
              className={`font-mono text-[13px] font-semibold ${
                a.side === "buy" ? "text-green" : "text-red"
              }`}
            >
              {a.side.toUpperCase()}
            </span>
          )}
          <span className="text-xs text-muted">{a.when}</span>
        </li>
      ))}
    </ul>
  );
}
