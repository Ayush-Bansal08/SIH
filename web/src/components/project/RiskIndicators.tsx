import { CircleCheck, CircleMinus, TriangleAlert } from "lucide-react";
import { formatCr, formatMonth, formatMonths } from "@/lib/format";
import type { Project } from "@/lib/types";

type Status = "alert" | "watch" | "ok";
interface Indicator {
  label: string;
  value: string;
  status: Status;
}

/** Plain rule-based indicators computed only from the project's official figures (DERIVED). */
export function indicatorsFor(p: Project): Indicator[] {
  const d = p.derived;
  const prog = p.official.physical_progress_pct;
  const spent = d.spent_pct_of_sanction ?? 0;
  const out: Indicator[] = [];

  out.push(
    d.delay_months && d.delay_months > 0
      ? { label: "Schedule slippage", value: `${formatMonths(d.delay_months)} behind the original target (${formatMonth(p.dates.original_completion)})`, status: d.delay_months >= 12 ? "alert" : "watch" }
      : { label: "Schedule slippage", value: "Still on the original completion date", status: "ok" },
  );
  if (d.months_to_target !== null) {
    out.push(
      d.months_to_target < 0
        ? { label: "Deadline", value: `Current target (${formatMonth(p.dates.expected_completion)}) has already passed`, status: "alert" }
        : d.months_to_target <= 1 && prog < 100
          ? { label: "Deadline", value: `Target ${formatMonth(p.dates.expected_completion)} with ${(100 - prog).toFixed(0)}% of the work remaining`, status: prog < 95 ? "alert" : "watch" }
          : { label: "Deadline", value: `${formatMonths(d.months_to_target)} to the current target`, status: "ok" },
    );
  }
  out.push(
    d.date_revisions_tracked >= 2
      ? { label: "Date revisions", value: `Completion date pushed back ${d.date_revisions_tracked} times since April 2026`, status: "alert" }
      : d.date_revisions_tracked === 1
        ? { label: "Date revisions", value: "Completion date pushed back once since April 2026", status: "watch" }
        : { label: "Date revisions", value: "No revision in the reports tracked", status: "ok" },
  );
  out.push(
    spent > 100
      ? { label: "Spending vs sanction", value: `${formatCr(p.official.expenditure_cr - d.sanctioned_cr)} above the sanctioned cost`, status: "alert" }
      : spent - prog > 25
        ? { label: "Spending vs progress", value: `${spent.toFixed(0)}% spent at ${prog.toFixed(0)}% physical progress`, status: "watch" }
        : { label: "Spending vs sanction", value: `${spent.toFixed(0)}% of the sanctioned cost spent`, status: "ok" },
  );
  if (d.time_elapsed_pct !== null && d.time_elapsed_pct - prog > 20 && prog < 100) {
    out.push({ label: "Progress vs plan", value: `${prog.toFixed(0)}% built with ${d.time_elapsed_pct.toFixed(0)}% of the planned time used`, status: "watch" });
  }
  if (d.cost_change_pct !== null && d.cost_change_pct > 0.1) {
    out.push({ label: "Cost revision", value: `Cost revised ${d.cost_change_pct.toFixed(1)}% above the original approval`, status: d.cost_change_pct >= 20 ? "alert" : "watch" });
  }
  // Reporting check: an implausible jump in cumulative expenditure between reports.
  for (let i = 1; i < p.history.length; i++) {
    const a = p.history[i - 1].expenditure_cr ?? 0;
    const b = p.history[i].expenditure_cr ?? 0;
    if (a > 0 && b / a > 3 && b - a > 100) {
      out.push({
        label: "Reporting check",
        value: `Reported expenditure jumped from ${formatCr(a)} to ${formatCr(b)} in the ${formatMonth(p.history[i].month)} report — likely a reporting catch-up; confirm with the agency`,
        status: "watch",
      });
      break;
    }
  }
  if (p.data_quality.verify) {
    out.push({ label: "Data quality", value: "Error-level data-quality flag — verify the figures", status: "alert" });
  }
  return out;
}

const ICON = {
  alert: { Icon: TriangleAlert, cls: "text-risk-high", word: "Concern" },
  watch: { Icon: CircleMinus, cls: "text-risk-moderate", word: "Watch" },
  ok: { Icon: CircleCheck, cls: "text-risk-low", word: "OK" },
} as const;

export function RiskIndicators({ p }: { p: Project }) {
  const items = indicatorsFor(p);
  return (
    <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((it) => {
        const s = ICON[it.status];
        return (
          <li key={it.label} className="flex gap-2.5">
            <s.Icon className={`mt-0.5 size-4 shrink-0 ${s.cls}`} aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-ink">
                {it.label} <span className="sr-only">({s.word})</span>
              </p>
              <p className="text-ink-muted">{it.value}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
