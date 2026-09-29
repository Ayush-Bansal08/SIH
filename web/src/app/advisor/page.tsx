import { NextStep } from "@/components/layout/NextStep";
import { ArrowLeftRight, PiggyBank, Scale, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { AdvisorWorkspace, PartTitle } from "@/components/advisor/AdvisorWorkspace";
import { Stat, table } from "@/components/ui/data";
import { Card, PageHeader } from "@/components/ui/primitives";
import { AS_OF_LABEL, REPORT_LABEL, advisor } from "@/lib/data";
import { formatCr, formatInt } from "@/lib/format";

export const metadata: Metadata = { title: "Reallocation Advisor" };

/** The whole idea of the page, in three plain steps. */
const IDEA = [
  {
    icon: PiggyBank,
    tone: "bg-risk-low-bg text-risk-low",
    title: "One project has spare money",
    text: "Its approved cost was officially revised down, so part of the original budget is no longer needed.",
  },
  {
    icon: TriangleAlert,
    tone: "bg-risk-high-bg text-risk-high",
    title: "Another is over budget",
    text: "It has already spent more than its sanctioned cost.",
  },
  {
    icon: ArrowLeftRight,
    tone: "bg-saffron-100 text-saffron-600",
    title: "PRISM suggests a pairing",
    text: "Only inside the same ministry, same agency first. It is a suggestion: officials decide, and no money is moved.",
  },
];

export default function AdvisorPage() {
  const t = advisor.totals;
  const unmatched = advisor.ministries.filter((m) => m.unmatched_shortfall_cr >= 1);
  const rows = advisor.ministries.filter((m) => m.buffer_projects > 0 || m.shortfall_projects > 0);

  return (
    <AdvisorWorkspace
      scenarios={advisor.scenarios}
      caveat={advisor.caveat}
      top={
        <div className="space-y-10">
          <PageHeader
            eyebrow={`Reallocation Advisor · ${AS_OF_LABEL}`}
            title="Where could the money come from?"
            description="Some projects need less money than first approved, while others have spent more than theirs. PRISM finds such pairs inside the same ministry and shows how much of the gap the spare money could cover."
          />
          <section aria-labelledby="idea-title">
            <h2 id="idea-title" className="sr-only">How it works</h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {IDEA.map((s, i) => (
                <li key={s.title} className="rounded-2xl border border-line bg-surface p-6">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex size-10 items-center justify-center rounded-xl ${s.tone}`}>
                      <s.icon className="size-5" aria-hidden />
                    </span>
                    <span className="tabular text-xs font-semibold text-ink-subtle">Step {i + 1}</span>
                  </div>
                  <p className="mt-4 font-semibold text-navy-950">{s.title}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{s.text}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm leading-relaxed text-ink-subtle">
              <strong className="font-semibold text-ink-muted">Recommendation, not execution.</strong> {advisor.caveat}
            </p>
          </section>
        </div>
      }
    >
      <section aria-labelledby="ministry-title">
        <PartTitle
          id="ministry-title"
          title="Across all ministries"
          text={`All ongoing projects in ${REPORT_LABEL}. Where a ministry has needs but no spare money, PRISM says so rather than inventing one.`}
        />
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Projects with spare money" value={formatInt(t.buffer_projects)} evidence="DERIVED" sub={`${formatCr(t.buffer_cr, 0)} below original approvals`} info="Latest revised cost below the original approved cost (official downward revision)." />
            <Stat label="Projects over budget" value={formatInt(t.shortfall_projects)} evidence="DERIVED" sub={`${formatCr(t.shortfall_cr, 0)} above sanction`} info="Cumulative expenditure above the sanctioned (latest revised) cost. Projects with suspect figures are excluded." />
            <Stat label="Possible pairings" value={formatInt(t.recommendations)} evidence="ILLUSTRATIVE" sub={`${formatCr(t.matched_cr, 0)} could be matched`} icon={<Scale className="size-4" aria-hidden />} emphasis info={`Same-ministry pairings; ${t.same_agency} of them inside the same agency.`} />
            <Stat label="Needs with no match" value={formatInt(t.unmatched_shortfall_projects)} evidence="DERIVED" sub={unmatched.length ? `largest: ${unmatched[0].ministry_short}, ${formatCr(unmatched[0].unmatched_shortfall_cr, 0)}` : "none"} info="Shortfalls that no same-ministry buffer can cover — these need a revised sanction or budget decision." />
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className={table.table}>
                <caption className="sr-only">Spare money, shortfalls and matched amounts by ministry</caption>
                <thead className={table.thead}>
                  <tr>
                    <th scope="col" className={`${table.th} px-5`}>Ministry / department</th>
                    <th scope="col" className={`${table.th} text-right`}>Spare money</th>
                    <th scope="col" className={`${table.th} text-right`}>Over budget</th>
                    <th scope="col" className={`${table.th} text-right`}>Could be matched</th>
                    <th scope="col" className={`${table.th} px-5 text-right`}>Still unmatched</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.ministry} className={table.tr}>
                      <td className={`${table.td} px-5 py-4 font-medium text-ink`}>{m.ministry}</td>
                      <td className={`${table.td} ${table.num} py-4`}>{m.buffer_cr ? formatCr(m.buffer_cr, 0) : "—"}</td>
                      <td className={`${table.td} ${table.num} py-4`}>{m.shortfall_cr ? formatCr(m.shortfall_cr, 0) : "—"}</td>
                      <td className={`${table.td} ${table.num} py-4 ${m.matched_cr ? "font-medium text-risk-low" : ""}`}>{m.matched_cr ? formatCr(m.matched_cr, 0) : "—"}</td>
                      <td className={`${table.td} ${table.num} px-5 py-4 ${m.unmatched_shortfall_cr >= 1 ? "font-medium text-risk-high" : ""}`}>
                        {m.unmatched_shortfall_cr >= 1 ? formatCr(m.unmatched_shortfall_cr, 0) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="text-sm leading-relaxed text-ink-subtle">
            All amounts are derived from official Flash Report figures. {advisor.excluded_for_verification.length} projects with suspect figures (error-level data-quality flags,
            or a revised cost below half the original) are held back for verification and never used.
          </p>
        </div>
      </section>

      <NextStep href="/evidence/" question="How do we know these scores can be trusted?" label="See the evidence: tested on a month PRISM never saw" />
    </AdvisorWorkspace>
  );
}
