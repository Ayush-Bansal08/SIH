import { ArrowRight, Building2, CalendarClock, IndianRupee, Info, Layers, Scale } from "lucide-react";
import type { Metadata } from "next";
import { TrendChart } from "@/components/charts/TrendChart";
import { ChartFrame, MeterRow, Stat, table } from "@/components/ui/data";
import { Badge, Button, Callout, Card, CardBody, CardHeader, EmptyState, LinkButton, PageHeader, Skeleton } from "@/components/ui/primitives";
import { EvidenceTag, RiskBadge, RiskGauge, ScoreBar, SourceNote } from "@/components/ui/risk";
import { InfoTip } from "@/components/ui/Tooltip";
import { AS_OF_LABEL, REPORT_LABEL, advisor, heroProject, portfolio, projects } from "@/lib/data";
import { formatCr, formatInt, formatLakhCr, formatMonth, formatMonths } from "@/lib/format";
import { BANDS, FUNDING_META, SCHEDULE_META } from "@/lib/labels";

export const metadata: Metadata = { title: "Design system" };

const SWATCHES = [
  { name: "Navy 950", v: "#0a0a0a", use: "Identity strip, headings" },
  { name: "Navy 800", v: "#171717", use: "Primary actions, official data" },
  { name: "PRISM cyan 600", v: "#3d3d3a", use: "Links, accents, focus" },
  { name: "Saffron 500", v: "#e8871e", use: "Sparse accent (hero feature)" },
  { name: "Canvas", v: "#f5f6f8", use: "Page background" },
  { name: "Line", v: "#e2e5eb", use: "Borders, grid lines" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-28">
      <h2 id={id} className="mb-3 text-lg font-semibold text-navy-950">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const hero = heroProject ?? projects[0];
  const sample = projects.slice(0, 6);
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Design system · Phase 2"
        title="PRISM interface foundations"
        description="PAIMANA-inspired government identity, rebuilt for analysis: calm neutrals, one navy, one cyan, a sparing saffron accent, and risk that is always shown with a word and an icon — never colour alone."
        meta={<><Badge tone="brand">Light-first</Badge><Badge tone="brand">WCAG AA contrast</Badge><Badge tone="brand">Keyboard focus visible</Badge></>}
      />

      <Section id="colour" title="Colour">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SWATCHES.map((s) => (
            <div key={s.name} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="h-14" style={{ background: s.v }} />
              <div className="p-2.5 text-xs">
                <p className="font-semibold text-ink">{s.name}</p>
                <p className="font-mono text-ink-subtle">{s.v}</p>
                <p className="mt-1 text-ink-muted">{s.use}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="type" title="Typography">
        <Card>
          <CardBody className="space-y-3">
            <p className="text-3xl font-semibold tracking-tight text-navy-950">Where to act next — 30 px / semibold</p>
            <p className="text-lg font-semibold text-navy-950">Section heading — 18 px / semibold</p>
            <p className="text-base text-ink-muted">Body — 16 px. PAIMANA tells you what happened; PRISM tells you where to act next, why, and what options exist.</p>
            <p className="tabular text-2xl font-semibold text-navy-950">{formatCr(portfolio.official.revised_cost_cr, 0)} · {formatLakhCr(portfolio.official.revised_cost_cr)}</p>
            <p className="text-xs text-ink-subtle">Figures use tabular numerals and Indian digit grouping.</p>
          </CardBody>
        </Card>
      </Section>

      <Section id="evidence" title="Data-honesty labels">
        <Card>
          <CardBody className="flex flex-wrap items-center gap-3">
            <EvidenceTag kind="OFFICIAL" /> <EvidenceTag kind="DERIVED" /> <EvidenceTag kind="MODEL ESTIMATE" /> <EvidenceTag kind="ILLUSTRATIVE" />
            <span className="text-sm text-ink-muted">Every number carries one. Hover or focus a label for its meaning.</span>
          </CardBody>
        </Card>
      </Section>

      <Section id="risk" title="Risk: badges, score bars, gauge">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader title="Bands" description="Calibrated chance of a completion-date revision in the next report" />
            <CardBody className="space-y-3">
              {portfolio.risk_bands.map((b) => (
                <div key={b.band} className="flex items-center justify-between gap-3">
                  <RiskBadge band={b.band} />
                  <span className="text-right text-xs text-ink-muted">{b.meaning}</span>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Score bars (tables)" />
            <CardBody className="space-y-2.5">
              {sample.slice(0, 5).map((p) => (
                <div key={p.code} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-ink-muted">{p.code}</span>
                  <ScoreBar score={p.risk.score} band={p.risk.band} />
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Gauge (risk profile)" description={`${hero.name} (${hero.code})`} />
            <CardBody className="flex justify-center py-6">
              <RiskGauge score={hero.risk.score} band={hero.risk.band} />
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section id="kpi" title="KPI tiles">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Ongoing projects" value={formatInt(portfolio.official.ongoing_projects)} evidence="OFFICIAL" sub={`${REPORT_LABEL}, p. ${portfolio.official.source_page}`} icon={<Layers className="size-4" aria-hidden />} info="Central projects of ₹150 crore and above monitored in the monthly Flash Report." />
          <Stat label="Revised cost" value={formatLakhCr(portfolio.official.revised_cost_cr)} evidence="OFFICIAL" sub={AS_OF_LABEL} icon={<IndianRupee className="size-4" aria-hidden />} />
          <Stat label="Delayed vs original date" value={formatInt(portfolio.derived.delayed_projects)} evidence="DERIVED" sub={`median ${formatMonths(portfolio.derived.median_delay_months)}`} icon={<CalendarClock className="size-4" aria-hidden />} />
          <Stat label="High delay risk" value={formatInt(portfolio.derived.risk_bands.high)} evidence="MODEL ESTIMATE" sub="next-report revision ≥ 40%" icon={<Scale className="size-4" aria-hidden />} emphasis />
        </div>
      </Section>

      <Section id="status" title="Status badges and meters">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardBody className="flex flex-wrap gap-2">
              {Object.entries(SCHEDULE_META).map(([k, m]) => <Badge key={k} tone={m.tone}>{m.label}</Badge>)}
              {Object.entries(FUNDING_META).map(([k, m]) => <Badge key={k} tone={m.tone}>{m.label}</Badge>)}
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-4">
              <MeterRow label="Physical progress" value={hero.official.physical_progress_pct} color="var(--color-navy-800)" />
              <MeterRow label="Spent of sanctioned cost" value={hero.derived.spent_pct_of_sanction} max={Math.max(100, hero.derived.spent_pct_of_sanction ?? 0)} display={`${hero.derived.spent_pct_of_sanction?.toFixed(1)}%`} color="var(--color-saffron-500)" marker={100} markerLabel="Sanctioned cost" />
              <SourceNote>{hero.source.report} ({formatMonth(hero.source.month)}), {hero.source.table}, p. {hero.source.page}</SourceNote>
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section id="buttons" title="Buttons, tooltips, callouts">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="accent">Explore scenario <ArrowRight className="size-4" aria-hidden /></Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <LinkButton href="/advisor/" variant="secondary" size="sm">Link button</LinkButton>
              <span className="inline-flex items-center gap-1 text-sm text-ink-muted">KPI definition <InfoTip label="KPI">Tooltips open on hover and on keyboard focus.</InfoTip></span>
            </div>
            <Callout tone="illustrative" icon={<Info className="size-4" aria-hidden />} title="Illustrative scenario — not an actual fund transfer">
              {advisor.caveat}
            </Callout>
            <Callout tone="info" icon={<Building2 className="size-4" aria-hidden />}>{portfolio.sample.note}</Callout>
          </CardBody>
        </Card>
      </Section>

      <Section id="table" title="Table">
        <div className={table.wrap}>
          <table className={table.table}>
            <caption className="sr-only">Sample projects with risk scores</caption>
            <thead className={table.thead}>
              <tr>
                <th scope="col" className={table.th}>Project</th>
                <th scope="col" className={table.th}>Ministry</th>
                <th scope="col" className={`${table.th} text-right`}>Original cost</th>
                <th scope="col" className={`${table.th} text-right`}>Progress</th>
                <th scope="col" className={table.th}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {sample.map((p) => (
                <tr key={p.code} className={table.tr}>
                  <td className={table.td}>
                    <p className="line-clamp-1 max-w-md font-medium text-ink">{p.name}</p>
                    <p className="text-xs text-ink-subtle">{p.code} · {p.state}</p>
                  </td>
                  <td className={table.td}>{p.ministry_short}</td>
                  <td className={`${table.td} ${table.num}`}>{formatCr(p.official.original_cost_cr, 0)}</td>
                  <td className={`${table.td} ${table.num}`}>{p.official.physical_progress_pct.toFixed(0)}%</td>
                  <td className={table.td}><div className="flex items-center gap-2"><ScoreBar score={p.risk.score} band={p.risk.band} /><RiskBadge band={p.risk.band} withTooltip={false} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="chart" title="Chart style">
        <Card>
          <CardBody>
            <ChartFrame
              question="How have the monitored portfolio's costs and spending moved month to month?"
              summary={portfolio.trend.map((t) => `${t.month}: original ${formatLakhCr(t.original_cost_cr)}, revised ${formatLakhCr(t.revised_cost_cr)}, expenditure ${formatLakhCr(t.expenditure_cr)}`).join("; ")}
              footer={<span className="inline-flex items-center gap-2"><EvidenceTag kind="OFFICIAL" /> Flash Reports #486–#490, overview page</span>}
            >
              <TrendChart data={portfolio.trend} />
            </ChartFrame>
          </CardBody>
        </Card>
      </Section>

      <Section id="states" title="Loading and empty states">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardBody className="space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <p className="text-xs text-ink-subtle">Loading never shows a fake “₹0”.</p>
            </CardBody>
          </Card>
          <EmptyState title="No projects match these filters">Try removing a filter.</EmptyState>
        </div>
      </Section>

      <div className="flex flex-wrap gap-2">
        {BANDS.map((b) => <RiskBadge key={b} band={b} size="md" withTooltip={false} />)}
      </div>
    </div>
  );
}
