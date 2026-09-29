import { NextStep } from "@/components/layout/NextStep";
import { ArrowRight, CalendarClock, IndianRupee, Layers, Scale, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ScenarioTeaser } from "@/components/advisor/ScenarioTeaser";
import { BandDistribution } from "@/components/charts/BandDistribution";
import { MinistryRiskChart } from "@/components/charts/MinistryRiskChart";
import { PriorityList } from "@/components/command/PriorityList";
import { CountUp } from "@/components/ui/CountUp";
import { ChartFrame, Stat, table } from "@/components/ui/data";
import { Callout, Card, CardBody, CardHeader, LinkButton, PageHeader } from "@/components/ui/primitives";
import { EvidenceTag, RiskBadge, ScoreBar } from "@/components/ui/risk";
import { AS_OF_LABEL, REPORT_LABEL, advisor, evidence, featuredScenario, financialPressure, heroProject, portfolio } from "@/lib/data";
import { formatCr, formatInt, formatMonths, formatPct } from "@/lib/format";
import { priorityRows, sampleMinistries } from "@/lib/rows";

export const metadata: Metadata = { title: "Command Center" };

export default function CommandCenterPage() {
  const { official, derived } = portfolio;
  const ministries = [...portfolio.ministries]
    .filter((m) => m.high_risk + m.elevated_risk > 0)
    .sort((a, b) => b.high_risk + b.elevated_risk - (a.high_risk + a.elevated_risk))
    .slice(0, 8);
  const t = evidence.test;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Command Center · ${AS_OF_LABEL}`}
        title="Where to act next"
        description={`PRISM scored all ${formatInt(official.ongoing_projects)} ongoing projects in ${REPORT_LABEL} for the chance that their official completion date is pushed back in the next report — and ranked where attention pays off first.`}
        actions={
          <LinkButton href="/advisor/" variant="accent">
            Reallocation Advisor <ArrowRight className="size-4" aria-hidden />
          </LinkButton>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="Ongoing projects"
          value={formatInt(official.ongoing_projects)}
          evidence="OFFICIAL"
          sub={`${REPORT_LABEL}, p. ${official.source_page}`}
          icon={<Layers className="size-4" aria-hidden />}
          info="Central projects of ₹150 crore and above in the monthly Flash Report."
        />
        <Stat
          label="High delay risk"
          value={<CountUp value={derived.risk_bands.high} />}
          evidence="MODEL ESTIMATE"
          sub={`+${formatInt(derived.risk_bands.elevated)} elevated`}
          icon={<TriangleAlert className="size-4" aria-hidden />}
          info="Projects with a 40% or higher chance that their completion date is pushed back in the next report."
          emphasis
        />
        <Stat
          label="Schedule slippage"
          value={<CountUp value={derived.delayed_projects} />}
          evidence="DERIVED"
          sub={`median ${formatMonths(derived.median_delay_months)} late`}
          icon={<CalendarClock className="size-4" aria-hidden />}
          info="Projects whose current completion date is later than the originally approved date."
        />
        <Stat
          label="Spent beyond sanction"
          value={<CountUp value={financialPressure.projects} />}
          evidence="DERIVED"
          sub={`${formatCr(financialPressure.amount_cr, 0)} above sanction`}
          icon={<IndianRupee className="size-4" aria-hidden />}
          info="Cumulative expenditure above the sanctioned (latest revised) cost. Projects with suspect figures are excluded."
        />
        <Stat
          label="Budget scenarios"
          value={<CountUp value={advisor.totals.recommendations} />}
          evidence="ILLUSTRATIVE"
          sub={`same-ministry pairings, ${formatCr(advisor.totals.matched_cr, 0)}`}
          icon={<Scale className="size-4" aria-hidden />}
          info="Pairings of officially revised-down projects (buffers) with projects spent beyond sanction, inside the same ministry."
        />
      </div>

      {/* Distribution + ministries */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Risk across the portfolio"
            description={`All ${formatInt(official.ongoing_projects)} projects, ${AS_OF_LABEL}`}
            action={<EvidenceTag kind="MODEL ESTIMATE" />}
          />
          <CardBody className="space-y-5">
            <BandDistribution counts={derived.risk_bands} />
            <Callout tone="info">
              <strong>Tested, not assumed.</strong> Scored on the {t.n.toLocaleString("en-IN")} projects of the July report, {t.high_correct} of the{" "}
              {t.high_flagged} placed in High ({formatPct(t.high_precision * 100)}) had their date pushed back in August.{" "}
              <Link href="/evidence/" className="font-medium underline underline-offset-2">See the evidence</Link>
            </Callout>
          </CardBody>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Where the risk concentrates" description="High and Elevated projects by ministry / department" action={<EvidenceTag kind="MODEL ESTIMATE" />} />
          <CardBody>
            <ChartFrame
              question="Which ministries hold most of the projects at risk of a date revision?"
              summary={ministries.map((m) => `${m.label}: ${m.high_risk} high, ${m.elevated_risk} elevated of ${m.projects}`).join("; ")}
            >
              <MinistryRiskChart rows={ministries} />
            </ChartFrame>
          </CardBody>
        </Card>
      </div>

      {/* Priority list + featured */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Priority list"
            description={portfolio.sample.note}
            action={<EvidenceTag kind="MODEL ESTIMATE" detail="Ranked by PRISM score; figures are official." />}
          />
          <PriorityList rows={priorityRows()} ministries={sampleMinistries()} />
        </Card>

        <div className="space-y-6">
          {heroProject && (
            <Card>
              <CardHeader eyebrow="Flagged this month" title={heroProject.name} description={`${heroProject.code} · ${heroProject.agency} · ${heroProject.state}`} />
              <CardBody className="space-y-3">
                <div className="flex items-center gap-3">
                  <ScoreBar score={heroProject.risk.score} band={heroProject.risk.band} />
                  <RiskBadge band={heroProject.risk.band} />
                </div>
                <ul className="space-y-2 text-sm text-ink-muted">
                  {heroProject.risk.drivers
                    .filter((d) => d.direction === "raises")
                    .map((d, i) => (
                      <li key={d.key} className="flex gap-2">
                        <span className="tabular mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-risk-high-bg text-xs font-semibold text-risk-high">{i + 1}</span>
                        {d.text}
                      </li>
                    ))}
                </ul>
                <LinkButton href={`/projects/${heroProject.code}/`} variant="secondary" size="sm">
                  Open risk profile <ArrowRight className="size-4" aria-hidden />
                </LinkButton>
              </CardBody>
            </Card>
          )}
          {featuredScenario && (
            <Card>
              <CardHeader eyebrow="Budget option found" title="A same-agency buffer exists" />
              <CardBody>
                <ScenarioTeaser s={featuredScenario} />
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Ministry table */}
      <Card>
        <CardHeader title="Ministry benchmark" description={`All ongoing projects, ${REPORT_LABEL}`} action={<span className="flex gap-1.5"><EvidenceTag kind="OFFICIAL" /><EvidenceTag kind="DERIVED" /><EvidenceTag kind="MODEL ESTIMATE" /></span>} />
        <div className="overflow-x-auto">
          <table className={table.table}>
            <caption className="sr-only">Projects, delays, overspending and risk by ministry</caption>
            <thead className={table.thead}>
              <tr>
                <th scope="col" className={table.th}>Ministry / department</th>
                <th scope="col" className={`${table.th} text-right`}>Projects</th>
                <th scope="col" className={`${table.th} text-right`}>Delayed</th>
                <th scope="col" className={`${table.th} text-right`}>Median delay</th>
                <th scope="col" className={`${table.th} text-right`}>Spent beyond sanction</th>
                <th scope="col" className={`${table.th} text-right`}>High risk</th>
                <th scope="col" className={`${table.th} text-right`}>Mean score</th>
              </tr>
            </thead>
            <tbody>
              {[...portfolio.ministries].sort((a, b) => b.projects - a.projects).map((m) => (
                <tr key={m.key} className={table.tr}>
                  <td className={table.td}>
                    <p className="font-medium text-ink">{m.label}</p>
                    <p className="text-xs text-ink-subtle">{m.key}</p>
                  </td>
                  <td className={`${table.td} ${table.num}`}>{formatInt(m.projects)}</td>
                  <td className={`${table.td} ${table.num}`}>{formatPct(m.share_delayed * 100)}</td>
                  <td className={`${table.td} ${table.num}`}>{m.median_delay_months ? formatMonths(m.median_delay_months) : "—"}</td>
                  <td className={`${table.td} ${table.num}`}>{m.overspent || "—"}</td>
                  <td className={`${table.td} ${table.num} ${m.high_risk ? "font-semibold text-risk-high" : ""}`}>{m.high_risk || "—"}</td>
                  <td className={`${table.td} ${table.num}`}>{m.mean_risk_score.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <NextStep href="/advisor/" question="Where could the money to fix a flagged project come from?" label="Open the Reallocation Advisor" />
    </div>
  );
}
