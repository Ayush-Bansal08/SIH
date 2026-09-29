import clsx from "clsx";
import type { ReactNode } from "react";
import type { EvidenceClass } from "@/lib/types";
import { EvidenceTag } from "./risk";
import { InfoTip } from "./Tooltip";

/** KPI tile: label (with ⓘ), value, context line and its evidence class. */
export function Stat({
  label,
  value,
  sub,
  evidence,
  info,
  icon,
  emphasis = false,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  evidence?: EvidenceClass;
  info?: ReactNode;
  icon?: ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col rounded-2xl border bg-surface p-4 shadow-[var(--shadow-card)]",
        emphasis ? "border-navy-100 ring-1 ring-navy-100" : "border-line",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
        {icon && <span className="text-prism-700">{icon}</span>}
        <span>{label}</span>
        {info && <InfoTip label={label}>{info}</InfoTip>}
      </div>
      <div className="tabular mt-2 text-2xl font-semibold tracking-tight text-navy-950">{value}</div>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {evidence && <EvidenceTag kind={evidence} />}
        {sub && <span className="text-xs text-ink-subtle">{sub}</span>}
      </div>
    </div>
  );
}

/** Horizontal bar with a label and value (e.g. physical progress vs time elapsed). */
export function MeterRow({
  label,
  value,
  max = 100,
  display,
  color = "var(--color-prism-600)",
  marker,
  markerLabel,
}: {
  label: string;
  value: number | null;
  max?: number;
  display?: string;
  color?: string;
  marker?: number | null;
  markerLabel?: string;
}) {
  const pct = value === null ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const m = marker === null || marker === undefined ? null : Math.min(100, Math.max(0, (marker / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="tabular font-semibold text-ink">{display ?? (value === null ? "—" : `${value.toFixed(0)}%`)}</span>
      </div>
      <div
        className="relative h-2.5 rounded-full bg-line"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value ?? undefined}
        aria-valuetext={display}
      >
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: color }} />
        {m !== null && (
          <div className="absolute -top-1 h-4.5 w-0.5 rounded bg-navy-950" style={{ left: `calc(${m}% - 1px)` }} title={markerLabel} aria-hidden />
        )}
      </div>
    </div>
  );
}

/** Figure wrapper for charts: every chart states the question it answers. */
export function ChartFrame({
  question,
  children,
  summary,
  footer,
}: {
  question: string;
  children: ReactNode;
  summary: string;
  footer?: ReactNode;
}) {
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-sm font-semibold text-ink">{question}</figcaption>
      <div aria-hidden>{children}</div>
      <p className="sr-only">{summary}</p>
      {footer && <div className="text-xs text-ink-subtle">{footer}</div>}
    </figure>
  );
}

/** Shared chart styling for Recharts. */
export const chartTheme = {
  grid: "#e2e5eb",
  axis: "#5d6574",
  font: 12,
  series: ["#171717", "#8a8a85", "#e8871e", "#5b3cc4", "#0e6a80"],
  tooltip: {
    contentStyle: {
      borderRadius: 8,
      border: "1px solid #e2e5eb",
      boxShadow: "0 4px 12px rgb(16 24 40 / 0.08)",
      fontSize: 12,
    },
  },
} as const;

/** Table utility classes (applied to native tables for semantics + a11y). */
export const table = {
  wrap: "overflow-x-auto rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]",
  table: "w-full border-collapse text-sm",
  thead: "bg-canvas text-left text-xs font-semibold uppercase tracking-wide text-ink-subtle",
  th: "border-b border-line px-3 py-2.5 font-semibold",
  tr: "border-b border-line last:border-0 transition-colors hover:bg-prism-50/50",
  td: "px-3 py-3 align-top",
  num: "tabular text-right whitespace-nowrap",
};
