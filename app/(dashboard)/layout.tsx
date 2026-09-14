const NAV = [
  { label: "Dashboard", icon: "◫", active: true },
  { label: "Portfolio", icon: "▤", active: false },
  { label: "Analytics", icon: "↗", active: false },
  { label: "History", icon: "◷", active: false },
  { label: "Settings", icon: "⚙", active: false },
];

export default function DashboardShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-panel px-4 py-5 md:flex">
        <div className="mb-8 px-2 text-lg font-semibold tracking-tight">
          WallSt <span className="text-muted">v</span>{" "}
          <span className="text-accent">Poly</span>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                item.active
                  ? "bg-panel-2 font-medium text-text"
                  : "text-muted"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 px-2 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-panel-2 text-xs font-semibold">
            JD
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">James Davidson</div>
            <div className="truncate text-xs text-muted">
              james@apexcapital.com
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
