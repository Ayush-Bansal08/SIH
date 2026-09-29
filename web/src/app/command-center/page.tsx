import { NextStep } from "@/components/layout/NextStep";
import { ArrowRight, CalendarClock, IndianRupee, Layers, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BandDistribution } from "@/components/charts/BandDistribution";
import { MinistryRiskChart } from "@/components/charts/MinistryRiskChart";
import { PriorityList } from "@/components/command/PriorityList";
import { CountUp } from "@/components/ui/CountUp";
import { Stat, table } from "@/components/ui/data";
import { Card, CardBody, LinkButton, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { RiskBadge, ScoreBar } from "@/components/ui/risk";
import { AS_OF_LABEL, REPORT_LABEL, evidence, financialPressure, heroProject, portfolio } from "@/lib/data";
import { formatCr, formatInt, formatMonths, formatPct } from "@/lib/format";
import { priorityRows } from "@/lib/rows";

export const metadata: Metadata = { title: "Command Center" };

export default function CommandCenterPage() {
  const { official, derived } = portfolio;
  const ministries = [...portfolio.ministries]
    .filter((m) => m.high_risk + m.elevated_risk > 0)
    .sort((a, b) => b.high_risk + b.elevated_risk - (a.high_risk + a.elevated_risk))
    .slice(0, 8);
  const t = evidence.test;
  const topReason = heroProject?.risk.drivers.find((d) => d.direction === "raises")?.text;

  return (
    <div className="space-y-24 pb-8 sm:space-y-32">
      {/* Where we are */}
      <div className="space-y-10">
        <PageHeader
          eyebrow={`Command Center · ${AS_OF_LABEL}`}
          title="Where to act next"
          description={`PRISM checked all ${formatInt(official.ongoing_projects)} ongoing projects in ${REPORT_LABEL} and asked one question: how likely is each project's official completion date to be pushed back in the next report?`}
        />
        <section aria-label="This month in numbers" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
            label="Already late"
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
        </section>
      </div>

      {/* 1. The list */}
      <section aria-labelledby="priority-title">
        <SectionTitle
          id="priority-title"
          title="Priority list"
          text={`${portfolio.sample.projects} real projects from ${REPORT_LABEL}, highest risk first. Open any project to see why it is flagged.`}
        />
        <div className="mx-auto max-w-5xl space-y-6">
          {heroProject && (
            <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-line bg-surface px-6 py-5 shadow-[var(--shadow-card)]">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-subtle">Flagged this month · start here</p>
                <p className="mt-1.5 font-semibold text-navy-950">{heroProject.name} <span className="font-normal text-ink-muted">· {heroProject.state}</span></p>
                {topReason && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{topReason}</p>}
              </div>
              <div className="flex items-center gap-4">
                <ScoreBar score={heroProject.risk.score} band={heroProject.risk.band} />
                <RiskBadge band={heroProject.risk.band} />
                <LinkButton href={`/projects/${heroProject.code}/`} variant="secondary" size="sm">
                  Open risk profile <ArrowRight className="size-4" aria-hidden />
                </LinkButton>
              </div>
            </div>
          )}
          <Card>
            <PriorityList rows={priorityRows()} />
          </Card>
          <p className="text-center text-xs text-ink-subtle">
            Ranked by the PRISM score, a model estimate. {portfolio.sample.note}
          </p>
        </div>
      </section>

      {/* 2. The whole portfolio */}
      <section aria-labelledby="bands-title">
        <SectionTitle
          id="bands-title"
          title="How risky are all the projects?"
          text={`Every one of the ${formatInt(official.ongoing_projects)} projects gets a 0–10 score and one of four risk bands.`}
        />
        <Card className="mx-auto max-w-4xl">
          <CardBody className="space-y-6 px-6 py-8 sm:px-10">
            <BandDistribution counts={derived.risk_bands} />
            <p className="border-t border-line pt-5 text-sm leading-relaxed text-ink-muted">
              <strong className="text-ink">Tested, not assumed.</strong> On the {t.n.toLocaleString("en-IN")} projects of the July report, {t.high_correct} of the{" "}
              {t.high_flagged} placed in High ({formatPct(t.high_precision * 100)}) really had their date pushed back in August.{" "}
              <Link href="/evidence/" className="font-medium text-ink underline underline-offset-2">See the evidence</Link>
            </p>
          </CardBody>
        </Card>
      </section>

      {/* 3. Where the risk sits */}
      <section aria-labelledby="ministry-chart-title">
        <SectionTitle id="ministry-chart-title" title="Which ministries hold the risk?" text="High and Elevated projects, by ministry or department." />
        <Card className="mx-auto max-w-5xl">
          <CardBody className="px-6 py-8 sm:px-10">
            <figure>
              <div aria-hidden>
                <MinistryRiskChart rows={ministries} />
              </div>
              <figcaption className="sr-only">
                {ministries.map((m) => `${m.label}: ${m.high_risk} high, ${m.elevated_risk} elevated of ${m.projects}`).join("; ")}
              </figcaption>
            </figure>
          </CardBody>
        </Card>
      </section>

      {/* 4. Every ministry */}
      <section aria-labelledby="ministry-table-title">
        <SectionTitle id="ministry-table-title" title="Every ministry at a glance" text={`All ongoing projects in ${REPORT_LABEL}.`} />
        <div className="mx-auto max-w-5xl">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className={table.table}>
                <caption className="sr-only">Projects, delays and high-risk projects by ministry</caption>
                <thead className={table.thead}>
                  <tr>
                    <th scope="col" className={`${table.th} px-5`}>Ministry / department</th>
                    <th scope="col" className={`${table.th} text-right`}>Projects</th>
                    <th scope="col" className={`${table.th} text-right`}>Late</th>
                    <th scope="col" className={`${table.th} text-right`}>Typical delay</th>
                    <th scope="col" className={`${table.th} px-5 text-right`}>High risk</th>
                  </tr>
                </thead>
                <tbody>
                  {[...portfolio.ministries].sort((a, b) => b.projects - a.projects).map((m) => (
                    <tr key={m.key} className={table.tr}>
                      <td className={`${table.td} px-5 py-4 font-medium text-ink`}>{m.label}</td>
                      <td className={`${table.td} ${table.num} py-4`}>{formatInt(m.projects)}</td>
                      <td className={`${table.td} ${table.num} py-4`}>{formatPct(m.share_delayed * 100)}</td>
                      <td className={`${table.td} ${table.num} py-4`}>{m.median_delay_months ? formatMonths(m.median_delay_months) : "—"}</td>
                      <td className={`${table.td} ${table.num} px-5 py-4 ${m.high_risk ? "font-semibold text-risk-high" : ""}`}>{m.high_risk || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="mt-4 text-center text-xs text-ink-subtle">
            Projects: official. Late and typical (median) delay: derived from official dates. High risk: PRISM estimate.
          </p>
        </div>
      </section>

      <NextStep href="/advisor/" question="Where could the money to fix a flagged project come from?" label="Open the Reallocation Advisor" />
    </div>
  );
}
