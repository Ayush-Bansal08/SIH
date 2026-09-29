import { ArrowRight, ChevronDown, ChevronRight, CircleCheck, Scale, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { HistoryChart } from "@/components/charts/HistoryChart";
import { DriverList, ModelOpinions, ScoreBreakdown } from "@/components/project/RiskExplain";
import { RiskIndicators, indicatorsFor } from "@/components/project/RiskIndicators";
import { ScheduleTimeline } from "@/components/project/ScheduleTimeline";
import { MeterRow, table } from "@/components/ui/data";
import { EvidenceTag, BAND_STYLE } from "@/components/ui/risk";
import { advisor, portfolio } from "@/lib/data";
import { formatCr, formatMonth, formatMonths } from "@/lib/format";
import { BAND_META, DQ_RULES } from "@/lib/labels";
import type { Project } from "@/lib/types";

/* ------------------------------------------------------------------ plain-language helpers */

const VERDICT: Record<Project["risk"]["band"], string> = {
  high: "High risk of a delay being announced",
  elevated: "Elevated risk of a delay being announced",
  moderate: "Some risk of a delay being announced",
  low: "Low risk of a delay being announced",
};

/** Up to three suggested next steps, built only from facts already in the data. */
function nextSteps(p: Project): { text: ReactNode; href?: string; cta?: string }[] {
  const out: { text: ReactNode; href?: string; cta?: string }[] = [];
  const scenario = advisor.scenarios.find((s) => s.source.project_code === p.code || s.destination.project_code === p.code);
  const over = p.official.expenditure_cr - p.derived.sanctioned_cr;
  const prog = p.official.physical_progress_pct;
  const jump = indicatorsFor(p).find((i) => i.label === "Reporting check");

  if (p.data_quality.verify) out.push({ text: "Verify the reported figures with the agency before relying on them." });
  if (scenario && scenario.destination.project_code === p.code) {
    out.push({
      text: (
        <>
          Another project in the same {scenario.match_level === "same agency" ? "agency" : "ministry"} is running{" "}
          <strong>{formatCr(scenario.source.buffer_cr)}</strong> under its original cost — it could cover part of this overspend.
        </>
      ),
      href: `/advisor/?scenario=${scenario.id}`,
      cta: "See the budget option",
    });
  } else if (scenario) {
    out.push({
      text: (
        <>
          This project has <strong>{formatCr(scenario.source.buffer_cr)}</strong> of spare budget that could help project {scenario.destination.project_code}.
        </>
      ),
      href: `/advisor/?scenario=${scenario.id}`,
      cta: "See the budget option",
    });
  } else if (over > 0.5 && !p.data_quality.excluded_from_advisor) {
    out.push({ text: <>Spending is <strong>{formatCr(over)}</strong> above the approved budget — check whether a revised sanction is needed.</> });
  }
  if (jump) out.push({ text: "Confirm the latest expenditure figure with the agency — it jumped sharply in one monthly report." });
  if ((p.risk.band === "high" || p.risk.band === "elevated") && p.derived.months_to_target !== null && p.derived.months_to_target <= 1 && prog < 100) {
    out.push({ text: <>The target date ({formatMonth(p.dates.expected_completion)}) is next month with {Math.max(0, 100 - prog).toFixed(0)}% of the work left — ask the agency for a realistic completion date.</> });
  }
  if (p.derived.date_revisions_tracked >= 2) out.push({ text: `Its completion date has been pushed back ${p.derived.date_revisions_tracked} times since April 2026 — it may need a closer review.` });
  if (prog >= 100) out.push({ text: "Reported 100% complete — confirm whether it should move to the completed list." });
  if (out.length === 0) out.push({ text: "No action needed right now — keep monitoring in the next report." });
  return out.slice(0, 3);
}

/** A collapsible "more details" section (native <details>: keyboard and screen-reader friendly). */
function More({ title, hint, children, open = false }: { title: string; hint: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-2xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block font-medium text-ink">{title}</span>
          <span className="block text-sm text-ink-subtle">{hint}</span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-ink-subtle transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-line px-6 py-6">{children}</div>
    </details>
  );
}

/** Left-aligned heading for one part of the profile (the list sits on the left). */
function PartTitle({ id, title, text }: { id: string; title: string; text?: ReactNode }) {
  return (
    <div className="mb-5">
      <h2 id={id} className="text-2xl font-normal tracking-[-0.02em] text-ink">{title}</h2>
      {text && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{text}</p>}
    </div>
  );
}

function Fact({ label, value, note, alert }: { label: string; value: string; note?: string; alert?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="tabular mt-1.5 text-2xl font-normal tracking-[-0.01em] text-ink">{value}</p>
      {note && <p className={`mt-1 text-sm ${alert ? "font-medium text-risk-high" : "text-ink-subtle"}`}>{note}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ profile */

/** Risk profile of one project: summary first, details on demand. */
export function ProjectProfile({ p, titleAs: Title = "h1" }: { p: Project; titleAs?: "h1" | "h2" }) {
  const band = BAND_STYLE[p.risk.band];
  const ups = p.risk.drivers.filter((d) => d.direction === "raises");
  const downs = p.risk.drivers.filter((d) => d.direction === "lowers");
  const reasons = ups.length ? ups : downs;
  const steps = nextSteps(p);
  const spent = p.derived.spent_pct_of_sanction ?? 0;
  const over = p.official.expenditure_cr - p.derived.sanctioned_cr;
  const delay = p.derived.delay_months ?? 0;
  const cost = p.derived.cost_change_pct;
  const src = `${p.source.report} (${formatMonth(p.source.month)}), ${p.source.table}, page ${p.source.page}`;

  return (
    <article className="space-y-16">
      {/* 1. What is this project? */}
      <header>
        <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-subtle lg:hidden">
          <Link href="/projects/" className="inline-flex items-center gap-1 hover:text-ink">
            <ChevronRight className="size-3.5 rotate-180" aria-hidden /> All projects
          </Link>
        </nav>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-subtle">{p.ministry}</p>
        <Title className="mt-2 text-balance text-3xl font-normal leading-tight tracking-[-0.02em] text-ink sm:text-[2.25rem]">{p.name}</Title>
        <p className="mt-2 text-sm text-ink-muted">
          Project {p.code} · {p.agency} · {p.state}
          {p.ner ? " · North-Eastern Region" : ""}
        </p>
      </header>

      {/* 2–4. Verdict, reasons, next steps */}
      <section aria-labelledby="verdict-title" className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid md:grid-cols-[15rem_1fr]">
          <div className={`flex flex-col justify-center gap-1 border-b border-line p-6 md:border-b-0 md:border-r ${band.bg}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">PRISM risk score</p>
            <p className="tabular text-5xl font-normal tracking-[-0.03em] text-ink">
              {p.risk.score.toFixed(1)}
              <span className="text-xl text-ink-subtle"> / 10</span>
            </p>
            <p className={`mt-1 inline-flex items-center gap-1.5 text-sm font-semibold ${band.text}`}>
              <band.Icon className="size-4" aria-hidden /> {BAND_META[p.risk.band].label} risk
            </p>
          </div>
          <div className="p-6">
            <h2 id="verdict-title" className="text-xl font-normal tracking-[-0.01em] text-ink">
              {VERDICT[p.risk.band]}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              PRISM estimates a <strong className="text-ink">{Math.round(p.risk.probability * 100)}% chance</strong> that the official completion date is pushed back again in
              the next monthly report.
            </p>
            <h3 className="mt-5 text-sm font-semibold text-ink">{ups.length ? "Why" : "Why the risk is low"}</h3>
            <ul className="mt-2 space-y-1.5">
              {reasons.slice(0, 3).map((d) => (
                <li key={d.key} className="flex gap-2 text-[15px] leading-relaxed text-ink">
                  <span className={`mt-2.5 size-1.5 shrink-0 rounded-full ${ups.length ? "bg-risk-high" : "bg-risk-low"}`} aria-hidden />
                  {d.text}
                </li>
              ))}
              {reasons.length === 0 && <li className="text-sm text-ink-muted">No single factor stands out this month.</li>}
            </ul>
          </div>
        </div>
      </section>

      {/* What to do */}
      <section aria-labelledby="steps-title">
        <PartTitle id="steps-title" title="Suggested next steps" text="PRISM suggests; officials decide. Any budget move needs formal approval." />
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-surface px-5 py-4">
              <span className="tabular inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{i + 1}</span>
              <span className="min-w-0 flex-1 text-[15px] leading-relaxed text-ink">{s.text}</span>
              {s.href && (
                <Link href={s.href} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">
                  <Scale className="size-3.5" aria-hidden /> {s.cta} <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Key facts */}
      <section aria-labelledby="facts-title">
        <PartTitle id="facts-title" title="Key facts" text={`From ${src}.`} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Fact
            label="Approved budget"
            value={formatCr(p.derived.sanctioned_cr, 0)}
            note={cost !== null && Math.abs(cost) > 0.1 ? `Originally ${formatCr(p.official.original_cost_cr, 0)} (${cost > 0 ? "+" : ""}${cost.toFixed(1)}%)` : "No cost revision"}
          />
          <Fact label="Spent so far" value={formatCr(p.official.expenditure_cr, 0)} note={over > 0.5 ? `${formatCr(over, 0)} over budget` : `${spent.toFixed(0)}% of the budget`} alert={over > 0.5} />
          <Fact label="Work completed" value={`${p.official.physical_progress_pct.toFixed(0)}%`} note={p.derived.time_elapsed_pct !== null ? `${p.derived.time_elapsed_pct.toFixed(0)}% of the planned time used` : undefined} />
          <Fact
            label="Expected completion"
            value={formatMonth(p.dates.expected_completion)}
            note={delay > 0 ? `${formatMonths(delay)} later than planned (${formatMonth(p.dates.original_completion)})` : "On the original date"}
            alert={delay > 0}
          />
        </div>
      </section>

      {/* Two plain questions */}
      <section aria-labelledby="time-title">
        <PartTitle id="time-title" title="Is it on time?" text={delay > 0 ? `No — the finish date has moved ${formatMonths(delay)} from the plan.` : "Yes — it is still on its original completion date."} />
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <ScheduleTimeline p={p} asOf={portfolio.as_of} />
        </div>
      </section>

      <section aria-labelledby="money-title">
        <PartTitle
          id="money-title"
          title="Is the money on track?"
          text={
            over > 0.5
              ? "No — more has been spent than the approved budget."
              : spent - p.official.physical_progress_pct > 25
                ? "Watch — spending is running ahead of the work done."
                : "Broadly yes — spending is in line with the work done."
          }
        />
        <div className="space-y-6 rounded-2xl border border-line bg-surface px-6 py-6">
          <MeterRow label="Work completed" value={p.official.physical_progress_pct} color="var(--color-ink)" />
          <MeterRow
            label="Budget spent"
            value={Math.min(spent, 200)}
            max={Math.max(100, Math.min(spent, 200))}
            display={`${spent.toFixed(0)}%`}
            color={over > 0.5 ? "var(--color-risk-high)" : "#8a8a85"}
            marker={100}
            markerLabel="Approved budget"
          />
        </div>
      </section>

      {/* Details on demand */}
      <section aria-labelledby="more-title">
        <PartTitle id="more-title" title="More details" text="The technical detail is folded away. Open any section to read it." />
        <div className="space-y-3">

        <More title="How the score was worked out" hint="Two independent models, and how much each factor adds">
          <div className="grid gap-8 xl:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold text-ink">Two independent opinions</p>
              <ModelOpinions p={p} />
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-ink">Factors and their weight</p>
              <DriverList p={p} />
            </div>
          </div>
          <div className="mt-8 border-t border-line pt-6">
            <p className="mb-3 text-sm font-semibold text-ink">What pushes the score up or down</p>
            <ScoreBreakdown p={p} />
          </div>
        </More>

        <More title="All warning signs" hint="Simple checks on the official figures, independent of the model">
          <RiskIndicators p={p} />
          {p.data_quality.flags.length > 0 && (
            <p className="mt-4 text-sm text-ink-muted">
              <TriangleAlert className="mr-1 inline size-4 text-risk-moderate" aria-hidden />
              Data-quality notes: {p.data_quality.flags.map((f) => `${f} ${DQ_RULES[f]?.title ?? ""}`).join("; ")}
            </p>
          )}
        </More>

        <More title="Month by month" hint="Progress, spending and target date in each report since April 2026">
          {p.history.length > 1 ? <HistoryChart history={p.history} /> : <p className="text-sm text-ink-muted">Only one report so far.</p>}
          <div className="mt-4 overflow-x-auto">
            <table className={table.table}>
              <caption className="sr-only">Monthly figures</caption>
              <thead className={table.thead}>
                <tr>
                  <th scope="col" className={table.th}>Report</th>
                  <th scope="col" className={`${table.th} text-right`}>Work completed</th>
                  <th scope="col" className={`${table.th} text-right`}>Spent (₹ Cr)</th>
                  <th scope="col" className={table.th}>Target date</th>
                </tr>
              </thead>
              <tbody>
                {p.history.map((h, i) => {
                  const moved = i > 0 && h.expected_completion && p.history[i - 1].expected_completion && h.expected_completion > p.history[i - 1].expected_completion!;
                  return (
                    <tr key={h.month} className={table.tr}>
                      <td className={table.td}>{formatMonth(h.month)}</td>
                      <td className={`${table.td} ${table.num}`}>{h.progress_pct?.toFixed(1)}%</td>
                      <td className={`${table.td} ${table.num}`}>{h.expenditure_cr?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                      <td className={table.td}>
                        {formatMonth(h.expected_completion)}
                        {moved && <span className="ml-2 text-xs font-medium text-risk-high">pushed back</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </More>

        <More title="Compared with similar projects" hint={p.peers.group}>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><dt className="text-ink-subtle">Similar projects</dt><dd className="tabular mt-0.5 text-lg text-ink">{p.peers.projects}</dd></div>
            <div><dt className="text-ink-subtle">Risk rank</dt><dd className="tabular mt-0.5 text-lg text-ink">{p.peers.risk_percentile !== null ? `Top ${Math.max(1, Math.round(100 - p.peers.risk_percentile + 1))}%` : "—"}</dd></div>
            <div><dt className="text-ink-subtle">Typical delay</dt><dd className="tabular mt-0.5 text-lg text-ink">{formatMonths(p.peers.median_delay_months)}</dd></div>
            <div><dt className="text-ink-subtle">Typical score</dt><dd className="tabular mt-0.5 text-lg text-ink">{p.peers.median_risk_score?.toFixed(1)}</dd></div>
          </dl>
        </More>

        <More title="Where these numbers come from" hint="Sources and how to read the labels">
          <ul className="space-y-2.5 text-sm text-ink-muted">
            <li className="flex items-start gap-3"><EvidenceTag kind="OFFICIAL" /> Budget, spending, progress and dates: {src}.</li>
            <li className="flex items-start gap-3"><EvidenceTag kind="DERIVED" /> Delay, overspend and percentages are calculated from those official figures.</li>
            <li className="flex items-start gap-3"><EvidenceTag kind="MODEL ESTIMATE" /> The risk score and its reasons come from PRISM&apos;s model, tested on a month it had never seen.</li>
            <li className="flex items-start gap-3"><EvidenceTag kind="ILLUSTRATIVE" /> Budget options are suggestions only — no money is moved.</li>
          </ul>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-subtle">
            <CircleCheck className="size-3.5" aria-hidden /> Official values are shown exactly as printed.
          </p>
        </More>
        </div>
      </section>
    </article>
  );
}
