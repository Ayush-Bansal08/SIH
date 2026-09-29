import { NextStep } from "@/components/layout/NextStep";
import { Info, Scale } from "lucide-react";
import type { Metadata } from "next";
import { AdvisorWorkspace } from "@/components/advisor/AdvisorWorkspace";
import { Stat, table } from "@/components/ui/data";
import { Callout, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/primitives";
import { EvidenceTag } from "@/components/ui/risk";
import { AS_OF_LABEL, REPORT_LABEL, advisor } from "@/lib/data";
import { formatCr, formatInt } from "@/lib/format";

export const metadata: Metadata = { title: "Reallocation Advisor" };

export default function AdvisorPage() {
  const t = advisor.totals;
  const unmatched = advisor.ministries.filter((m) => m.unmatched_shortfall_cr >= 1);
  const rows = advisor.ministries.filter((m) => m.buffer_projects > 0 || m.shortfall_projects > 0);

  return (
    <AdvisorWorkspace
      scenarios={advisor.scenarios}
      caveat={advisor.caveat}
      top={
        <>
      <PageHeader
        eyebrow={`Reallocation Advisor · ${AS_OF_LABEL}`}
        title="Explore potential funding scenarios"
        description="PRISM looks for budget headroom that already exists — projects officially revised below their original approved cost — and pairs it with projects that have spent beyond their sanction, inside the same ministry and preferably the same agency."
        meta={<><EvidenceTag kind="OFFICIAL" /><EvidenceTag kind="DERIVED" /><EvidenceTag kind="ILLUSTRATIVE" /></>}
      />

      <Callout tone="illustrative" icon={<Info className="size-4" aria-hidden />} title="Recommendation, not execution">
        {advisor.caveat}
      </Callout>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Projects with a buffer" value={formatInt(t.buffer_projects)} evidence="DERIVED" sub={`${formatCr(t.buffer_cr, 0)} below original approvals`} info="Latest revised cost below the original approved cost (official downward revision)." />
        <Stat label="Projects spent beyond sanction" value={formatInt(t.shortfall_projects)} evidence="DERIVED" sub={`${formatCr(t.shortfall_cr, 0)} above sanction`} info="Cumulative expenditure above the sanctioned (latest revised) cost. Projects with suspect figures are excluded." />
        <Stat label="Same-ministry pairings" value={formatInt(t.recommendations)} evidence="ILLUSTRATIVE" sub={`${formatCr(t.matched_cr, 0)} could be matched · ${t.same_agency} in the same agency`} icon={<Scale className="size-4" aria-hidden />} emphasis />
        <Stat label="Needs with no buffer in the ministry" value={formatInt(t.unmatched_shortfall_projects)} evidence="DERIVED" sub={unmatched.length ? `largest: ${unmatched[0].ministry_short}, ${formatCr(unmatched[0].unmatched_shortfall_cr, 0)}` : "none"} info="Shortfalls that no same-ministry buffer can cover — these need a revised sanction or budget decision." />
      </div>

        </>
      }
    >
      <Card>
        <CardHeader
          title="Buffers and shortfalls by ministry"
          description={`All ongoing projects, ${REPORT_LABEL}. Where a ministry has needs but no buffer, PRISM says so rather than inventing one.`}
          action={<EvidenceTag kind="DERIVED" />}
        />
        <div className="overflow-x-auto">
          <table className={table.table}>
            <caption className="sr-only">Buffers, shortfalls and matched amounts by ministry</caption>
            <thead className={table.thead}>
              <tr>
                <th scope="col" className={table.th}>Ministry / department</th>
                <th scope="col" className={`${table.th} text-right`}>Buffer projects</th>
                <th scope="col" className={`${table.th} text-right`}>Buffer</th>
                <th scope="col" className={`${table.th} text-right`}>Shortfall projects</th>
                <th scope="col" className={`${table.th} text-right`}>Shortfall</th>
                <th scope="col" className={`${table.th} text-right`}>Could be matched</th>
                <th scope="col" className={`${table.th} text-right`}>Unmatched need</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.ministry} className={table.tr}>
                  <td className={table.td}>
                    <p className="font-medium text-ink">{m.ministry}</p>
                    <p className="text-xs text-ink-subtle">{m.ministry_short}</p>
                  </td>
                  <td className={`${table.td} ${table.num}`}>{m.buffer_projects || "—"}</td>
                  <td className={`${table.td} ${table.num}`}>{m.buffer_cr ? formatCr(m.buffer_cr, 0) : "—"}</td>
                  <td className={`${table.td} ${table.num}`}>{m.shortfall_projects || "—"}</td>
                  <td className={`${table.td} ${table.num}`}>{m.shortfall_cr ? formatCr(m.shortfall_cr, 0) : "—"}</td>
                  <td className={`${table.td} ${table.num} ${m.matched_cr ? "font-medium text-risk-low" : ""}`}>{m.matched_cr ? formatCr(m.matched_cr, 0) : "—"}</td>
                  <td className={`${table.td} ${table.num} ${m.unmatched_shortfall_cr >= 1 ? "font-medium text-risk-high" : ""}`}>{m.unmatched_shortfall_cr >= 1 ? formatCr(m.unmatched_shortfall_cr, 0) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="How the Advisor works" />
        <CardBody>
          <ol className="grid gap-4 text-sm text-ink-muted md:grid-cols-2 lg:grid-cols-4">
            {[
              ["Find buffers", "Projects whose latest revised cost is below the original approved cost — an official downward revision, printed in the Flash Report."],
              ["Find shortfalls", "Projects whose cumulative expenditure already exceeds the sanctioned cost."],
              ["Pair within the ministry", "Only inside the same ministry/department (where funds are re-appropriated), same agency first, low-risk and near-complete sources first."],
              ["Guard the data", `Projects with error-level data-quality flags, or a revised cost below half the original (likely entry errors), are never used — ${advisor.excluded_for_verification.length} such projects are held for verification.`],
            ].map(([title, text], i) => (
              <li key={title} className="rounded-lg bg-canvas p-4">
                <p className="flex items-center gap-2 font-semibold text-navy-950">
                  <span className="tabular inline-flex size-6 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">{i + 1}</span>
                  {title}
                </p>
                <p className="mt-2 leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-ink-subtle">
            Production path: with the OCMS archive of completed projects, PRISM can also estimate each project&apos;s likely final cost range and flag buffers and shortfalls before they appear in the official figures.
          </p>
        </CardBody>
      </Card>
      <NextStep href="/evidence/" question="How do we know these scores can be trusted?" label="See the evidence: tested on a month PRISM never saw" />
    </AdvisorWorkspace>
  );
}
