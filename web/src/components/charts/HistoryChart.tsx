"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTheme } from "@/components/ui/data";
import { formatMonth } from "@/lib/format";
import type { HistoryPoint } from "@/lib/types";

interface Row extends HistoryPoint {
  label: string;
  moved: boolean;
}

/** Physical progress and cumulative expenditure across the monthly reports; saffron points mark a target-date revision. */
export function HistoryChart({ history }: { history: HistoryPoint[] }) {
  const rows: Row[] = history.map((h, i) => ({
    ...h,
    label: formatMonth(h.month),
    moved: i > 0 && !!h.expected_completion && !!history[i - 1].expected_completion && h.expected_completion > history[i - 1].expected_completion!,
  }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart accessibilityLayer={false} data={rows} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: chartTheme.font, fill: chartTheme.axis }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="p" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: chartTheme.font, fill: chartTheme.axis }} axisLine={false} tickLine={false} width={40} />
        <YAxis yAxisId="e" orientation="right" tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} tick={{ fontSize: chartTheme.font, fill: chartTheme.axis }} axisLine={false} tickLine={false} width={72} />
        <Tooltip
          {...chartTheme.tooltip}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload as Row;
            return (
              <div style={chartTheme.tooltip.contentStyle} className="bg-white px-3 py-2">
                <p className="font-semibold text-navy-950">{r.label}</p>
                <p>Physical progress: {r.progress_pct?.toFixed(1)}%</p>
                <p>Expenditure: ₹{r.expenditure_cr?.toLocaleString("en-IN")} Cr</p>
                <p>Target date: {formatMonth(r.expected_completion)}</p>
                {r.moved && <p className="font-semibold text-saffron-600">Target date pushed back this report</p>}
              </div>
            );
          }}
        />
        <Line
          yAxisId="p"
          dataKey="progress_pct"
          name="Physical progress"
          stroke="#171717"
          strokeWidth={2.5}
          animationDuration={500}
          dot={(props) => {
            const { cx, cy, payload, index } = props as { cx: number; cy: number; payload: Row; index: number };
            return payload.moved ? (
              <circle key={index} cx={cx} cy={cy} r={6.5} fill="#e8871e" stroke="#fff" strokeWidth={2} />
            ) : (
              <circle key={index} cx={cx} cy={cy} r={3.5} fill="#171717" />
            );
          }}
        />
        <Line yAxisId="e" dataKey="expenditure_cr" name="Cumulative expenditure" stroke="#8a8a85" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: "#8a8a85" }} animationDuration={500} />
      </LineChart>
    </ResponsiveContainer>
  );
}
