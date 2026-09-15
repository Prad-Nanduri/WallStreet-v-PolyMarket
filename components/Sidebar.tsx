"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Dashboard", href: "/", icon: "◫" },
  { label: "Portfolio", href: "/portfolio", icon: "▤" },
  { label: "Analytics", href: "/analytics", icon: "↗" },
  { label: "History", href: "/history", icon: "◷" },
  { label: "Settings", href: "/settings", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-44 shrink-0 flex-col border-r border-border bg-panel px-3 py-5 md:flex">
      <div className="mb-8 px-2 text-base font-semibold tracking-tight">
        WallSt <span className="text-muted">v</span>{" "}
        <span className="text-accent">Poly</span>
      </div>
      <nav className="flex flex-col gap-1 text-sm">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                active
                  ? "bg-panel-2 font-medium text-text"
                  : "text-muted hover:bg-[var(--hover)] hover:text-text"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border-soft px-2 pt-4 text-xs text-muted">
        Built by <span className="font-medium text-text">Prad Nanduri</span>
      </div>
    </aside>
  );
}
