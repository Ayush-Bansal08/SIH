"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTheme } from "@/components/ui/data";
import { formatMonth } from "@/lib/format";

export interface TrendPoint {
  month: string;
  original_cost_cr: number;
  revised_cost_cr: number;
  expenditure_cr: number;
}

const lakh = (v: number) => `₹${(v / 1e5).toFixed(1)}L`;

/** Official monthly totals (₹ lakh crore): original vs revised cost vs expenditure. */
export function TrendChart({ data, height = 260 }: { data: TrendPoint[]; height?: number }) {
  const rows = data.map((d) => ({ ...d, label: formatMonth(d.month) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart accessibilityLayer={false} data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
        <CartesianGrid stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: chartTheme.font, fill: chartTheme.axis }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={lakh} tick={{ fontSize: chartTheme.font, fill: chartTheme.axis }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          {...chartTheme.tooltip}
          cursor={{ fill: "#f4f4f2" }}
          formatter={(v) => `₹${(Number(v) / 1e5).toFixed(2)} lakh crore`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" itemSorter={null} />
        <Bar dataKey="original_cost_cr" name="Original cost" fill={chartTheme.series[0]} radius={[3, 3, 0, 0]} animationDuration={500} />
        <Bar dataKey="revised_cost_cr" name="Revised cost" fill={chartTheme.series[1]} radius={[3, 3, 0, 0]} animationDuration={500} />
        <Bar dataKey="expenditure_cr" name="Expenditure" fill={chartTheme.series[2]} radius={[3, 3, 0, 0]} animationDuration={500} />
      </BarChart>
    </ResponsiveContainer>
  );
}
