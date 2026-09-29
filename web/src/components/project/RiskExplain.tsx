import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Project } from "@/lib/types";

/** The top reasons behind the score, each with how many score points it adds. */
export function DriverList({ p }: { p: Project }) {
  const ups = p.risk.drivers.filter((d) => d.direction === "raises");
  const downs = p.risk.drivers.filter((d) => d.direction === "lowers");
  const maxImpact = Math.max(0.5, ...ups.map((d) => d.impact_points));
  return (
    <div className="space-y-5">
      {ups.length === 0 ? (
        <p className="text-sm text-ink-muted">No factor raises this project&apos;s risk noticeably this month.</p>
      ) : (
        <ol className="space-y-4">
          {ups.map((d, i) => (
            <li key={d.key} className="flex gap-3">
              <span className="tabular mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-risk-high-bg text-sm font-bold text-risk-high ring-1 ring-inset ring-risk-high-line">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy-950">{d.label}</p>
                  {d.data !== "CUF" && <Badge tone="info">{d.data}</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-ink-muted">{d.text}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
                    <span className="block h-full rounded-full bg-risk-high" style={{ width: `${(d.impact_points / maxImpact) * 100}%` }} />
                  </span>
                  <Tooltip content="How much lower the 0–10 score would be without this factor (exact decomposition of the fused model).">
                    <span tabIndex={0} className="tabular w-24 text-right text-xs font-semibold text-risk-high">+{d.impact_points.toFixed(1)} points</span>
                  </Tooltip>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {downs.length > 0 && (
        <div className="rounded-lg border border-risk-low-line bg-risk-low-bg/60 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-risk-low">
            <ShieldCheck className="size-4" aria-hidden /> Working in its favour
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
            {downs.map((d) => (
              <li key={d.key}>
                <span className="font-medium text-ink">{d.label}:</span> {d.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Diverging bars: which factors push the score up or down (log-odds contributions). */
export function ScoreBreakdown({ p }: { p: Project }) {
  const items = p.risk.breakdown;
  const max = Math.max(...items.map((b) => Math.abs(b.log_odds)), 0.01);
  return (
    <div>
      <div className="mb-2 grid grid-cols-[minmax(0,11rem)_1fr_1fr] gap-2 text-xs text-ink-subtle">
        <span />
        <span className="text-right">lowers risk</span>
        <span>raises risk</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((b) => {
          const w = (Math.abs(b.log_odds) / max) * 100;
          const up = b.log_odds > 0;
          return (
            <li key={b.driver} className="grid grid-cols-[minmax(0,11rem)_1fr_1fr] items-center gap-2 text-sm">
              <span className="truncate text-ink-muted" title={b.label}>{b.label}</span>
              <span className="flex justify-end border-r border-line-strong pr-0">
                {!up && <span className="h-3.5 rounded-l bg-risk-low" style={{ width: `${w}%` }} />}
              </span>
              <span className="flex">
                {up && <span className="h-3.5 rounded-r bg-risk-high" style={{ width: `${w}%` }} />}
              </span>
              <span className="sr-only">{up ? "raises" : "lowers"} risk</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-subtle">
        Largest factors shown; each bar is the factor&apos;s exact share of the fused score (log-odds). Logistic regression and Cox terms are linear; XGBoost terms are TreeSHAP values.
      </p>
    </div>
  );
}

/** Two independent opinions and the fused score (the "dual-track" engine). */
export function ModelOpinions({ p }: { p: Project }) {
  const rows = [
    { label: "Statistical track", sub: "Logistic regression + Cox survival model", v: p.risk.statistical_probability, color: "#171717" },
    { label: "Machine-learning track", sub: "XGBoost gradient-boosted trees", v: p.risk.ml_probability, color: "#8a8a85" },
    { label: "PRISM fused score", sub: "Accuracy-weighted combination", v: p.risk.probability, color: "#e8871e", strong: true },
  ];
  const agree = Math.abs(p.risk.statistical_probability - p.risk.ml_probability) < 0.15;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span>
              <span className={r.strong ? "font-semibold text-navy-950" : "font-medium text-ink"}>{r.label}</span>
              <span className="block text-xs text-ink-subtle">{r.sub}</span>
            </span>
            <span className={`tabular ${r.strong ? "text-lg font-bold text-navy-950" : "font-semibold text-ink"}`}>{(r.v * 100).toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${r.v * 100}%`, background: r.color }} />
          </div>
        </div>
      ))}
      <p className="text-xs text-ink-subtle">
        {agree ? "Both tracks agree." : "The tracks disagree noticeably — treat the fused score with extra care."} Chance that the official completion date is pushed back in the next monthly report.
      </p>
    </div>
  );
}
