"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

interface Props {
  points: number[]; // 7 daily spread values, last = today
}

export default function Sparkline({ points }: Props) {
  if (!points.length) return null;
  const last = points[points.length - 1];
  const color =
    Math.abs(last) > 10
      ? "var(--red)"
      : Math.abs(last) < 5
        ? "var(--green)"
        : "var(--muted)";
  const data = points.map((v, i) => ({ i, v }));
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={color}
            fillOpacity={0.15}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
