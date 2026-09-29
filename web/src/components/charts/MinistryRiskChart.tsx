"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTheme } from "@/components/ui/data";
import { BAND_STYLE } from "@/components/ui/risk";

export interface MinistryRow {
  key: string;
  label: string;
  projects: number;
  high_risk: number;
  elevated_risk: number;
}

/** High + Elevated project counts per ministry (horizontal, largest first). */
export function MinistryRiskChart({ rows }: { rows: MinistryRow[] }) {
  const data = rows.map((r) => ({ ...r, name: r.key }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34 + 40)}>
      <BarChart accessibilityLayer={false} data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }} barCategoryGap="28%">
        <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: chartTheme.font, fill: chartTheme.axis }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: chartTheme.font, fill: "#374151" }} axisLine={false} tickLine={false} />
        <Tooltip
          {...chartTheme.tooltip}
          cursor={{ fill: "#f4f4f2" }}
          labelFormatter={(_, p) => {
            const row = p?.[0]?.payload as MinistryRow | undefined;
            return row ? `${row.label} — ${row.projects} projects` : "";
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" itemSorter={null} />
        <Bar dataKey="high_risk" name="High" stackId="r" fill={BAND_STYLE.high.fill} animationDuration={500} />
        <Bar dataKey="elevated_risk" name="Elevated" stackId="r" fill={BAND_STYLE.elevated.fill} radius={[0, 3, 3, 0]} animationDuration={500} />
      </BarChart>
    </ResponsiveContainer>
  );
}
