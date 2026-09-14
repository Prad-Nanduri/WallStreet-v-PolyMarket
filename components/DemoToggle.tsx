"use client";

interface Props {
  demo: boolean;
  onChange: (demo: boolean) => void;
}

export default function DemoToggle({ demo, onChange }: Props) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-border text-xs font-medium">
      {(["Live Data", "Demo Data"] as const).map((label) => {
        const isDemo = label === "Demo Data";
        const active = demo === isDemo;
        return (
          <button
            key={label}
            onClick={() => onChange(isDemo)}
            className={`px-3 py-1.5 transition-colors ${
              active
                ? isDemo
                  ? "bg-red-bg text-red"
                  : "bg-green-bg text-green"
                : "bg-panel text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
