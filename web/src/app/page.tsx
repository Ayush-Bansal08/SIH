import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  FileText,
  Gauge,
  IndianRupee,
  Layers,
  ListOrdered,
  MessageSquareText,
  Scale,
  ScanSearch,
  UserCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { ScenarioTeaser } from "@/components/advisor/ScenarioTeaser";
import { BandDistribution } from "@/components/charts/BandDistribution";
import { CountUp } from "@/components/ui/CountUp";
import { Stat } from "@/components/ui/data";
import { Card, CardBody, CardHeader, LinkButton, SectionTitle } from "@/components/ui/primitives";
import { EvidenceTag, RiskGauge } from "@/components/ui/risk";
import { AS_OF_LABEL, REPORT_LABEL, evidence, featuredScenario, heroProject, portfolio } from "@/lib/data";
import { formatInt, formatLakhCr, formatMonths, formatPct } from "@/lib/format";

const STEPS = [
  { icon: FileText, title: "PAIMANA data", text: "Official monthly Flash Report figures — nothing new to collect", href: "/methodology/" },
  { icon: Gauge, title: "Risk detection", text: "A 0–10 early-warning score for every project", href: "/command-center/" },
  { icon: ScanSearch, title: "Explanation", text: "The top reasons behind each score, in plain language", href: heroProject ? `/projects/${heroProject.code}/` : "/projects/" },
  { icon: ListOrdered, title: "Prioritisation", text: "A ranked list of where attention pays off first", href: "/command-center/" },
  { icon: Wallet, title: "Prescriptive options", text: "Same-ministry budget scenarios — never transfers", href: "/advisor/" },
  { icon: UserCheck, title: "Decision support", text: "Officials decide, with evidence and sources", href: "/evidence/" },
];

// Where each output beam leaves the prism, where it ends, and what it stands for.
const BEAMS = [
  { from: [205.3, 103.2], to: [300, 60], stroke: "#0a0a0a", label: "#0a0a0a", title: "Risk", sub: "0–10 early warning" },
  { from: [212.8, 119.2], to: [300, 122], stroke: "#e8871e", label: "#86480b", title: "Reasons", sub: "Top 3 per project" },
  { from: [220.3, 135.2], to: [300, 184], stroke: "#8a8a85", label: "#4d4d4a", title: "Options", sub: "Budget scenarios" },
];

function HeroArt() {
  // Monthly PAIMANA data enters the prism and leaves as risk, reasons and options.
  return (
    <svg
      viewBox="0 0 420 216"
      className="h-auto w-full max-w-lg"
      role="img"
      aria-label="Monthly PAIMANA reports go into PRISM and come out as a risk score, its top reasons and budget options."
    >
      <text x="12" y="96" fill="#0a0a0a" fontSize="11" fontWeight="600" letterSpacing="1.5">PAIMANA DATA</text>
      <text x="12" y="112" fill="#63635f" fontSize="11">Monthly reports</text>
      <line className="beam-draw" pathLength={1} x1="12" y1="146" x2="123.5" y2="127.2" stroke="#a8a8a3" strokeWidth="2.2" strokeLinecap="round" />

      <path d="M170 28 L245 188 H95 Z" fill="#ffffff" stroke="#0a0a0a" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M123.5 127.2 L205.3 103.2 L220.3 135.2 Z" fill="#0a0a0a" fillOpacity="0.07" />
      <text x="170" y="172" textAnchor="middle" fill="#0a0a0a" fontSize="10.5" fontWeight="600" letterSpacing="3">PRISM</text>

      {BEAMS.map((b, i) => (
        <g key={b.title}>
          <line
            className="beam-draw"
            style={{ animationDelay: `${450 + i * 120}ms` }}
            pathLength={1}
            x1={b.from[0]}
            y1={b.from[1]}
            x2={b.to[0]}
            y2={b.to[1]}
            stroke={b.stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx={b.to[0]} cy={b.to[1]} r="3.5" fill={b.stroke} />
          <text x="312" y={b.to[1] + 6} fill={b.label} fontSize="18" fontStyle="italic" fontFamily="var(--font-serif)">{b.title}</text>
          <text x="312" y={b.to[1] + 21} fill="#63635f" fontSize="11">{b.sub}</text>
        </g>
      ))}
    </svg>
  );
}

export default function OverviewPage() {
  const { official, derived } = portfolio;
  const t = evidence.test;
  return (
    <div className="space-y-24 pb-8 sm:space-y-32">
      {/* 1. What this is */}
      <section className="animate-rise relative overflow-hidden rounded-[28px] border border-line bg-surface" aria-labelledby="hero-title">
        <div className="relative grid items-center gap-12 px-6 py-16 sm:px-12 lg:min-h-[32rem] lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-subtle">
              <span className="size-1.5 rounded-full bg-ink" aria-hidden />
              Built on {REPORT_LABEL} · {AS_OF_LABEL}
            </p>
            <h1 id="hero-title" className="mt-6 text-balance text-[2.6rem] font-normal leading-[1.05] tracking-[-0.03em] text-ink sm:text-6xl">
              From monitoring
              <br />
              to <span className="font-serif italic tracking-[-0.01em]">decision intelligence.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              PAIMANA, MoSPI&apos;s project-monitoring system, tells you what happened.{" "}
              <span className="text-ink">PRISM tells you where to act next, why, and what options exist.</span>
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/command-center/" className="group inline-flex h-12 items-center gap-3 rounded-full bg-ink pl-6 pr-2 font-medium text-white transition-colors hover:bg-navy-700">
                Open the Command Center
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5"><ArrowRight className="size-4" aria-hidden /></span>
              </Link>
              <Link href="/advisor/" className="inline-flex h-12 items-center gap-2 rounded-full px-5 font-medium text-ink ring-1 ring-inset ring-line-strong transition-colors hover:bg-canvas">
                See the Reallocation Advisor <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
          <div className="hidden justify-center rounded-3xl bg-canvas p-8 lg:flex">
            <HeroArt />
          </div>
        </div>
      </section>

      {/* 2. Before / after (solution document §3.3) */}
      <section aria-labelledby="change-title">
        <SectionTitle id="change-title" title="What changes with PRISM" text="The same monthly report, read differently." />
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <Card className="bg-canvas">
            <CardHeader eyebrow="Before · today" title="Every project looks equally urgent" />
            <CardBody>
              <ul className="space-y-4 text-[15px] leading-relaxed text-ink-muted">
                <li className="flex gap-3"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-subtle" aria-hidden />A {REPORT_LABEL} PDF with {formatInt(official.ongoing_projects)} rows, one after another.</li>
                <li className="flex gap-3"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-subtle" aria-hidden />A completion-date slip is visible only after it has been recorded — {formatInt(derived.delayed_projects)} projects are already late.</li>
                <li className="flex gap-3"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-subtle" aria-hidden />No view of where money to fix a problem could come from.</li>
              </ul>
            </CardBody>
          </Card>
          <Card className="border-prism-100 ring-1 ring-prism-100">
            <CardHeader eyebrow="After · with PRISM" title="A shortlist with reasons and options" />
            <CardBody>
              <ul className="space-y-4 text-[15px] leading-relaxed text-ink-muted">
                <li className="flex gap-3"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-prism-500" aria-hidden /><span><strong className="text-ink">{formatInt(derived.risk_bands.high)} projects flagged High</strong>, each with its top three reasons.</span></li>
                {heroProject && featuredScenario && (
                  <li className="flex gap-3"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-prism-500" aria-hidden /><span><Link href={`/projects/${heroProject.code}/`} className="font-semibold text-prism-700 hover:underline">{heroProject.name}</Link> scores {heroProject.risk.score.toFixed(1)}/10 — and a same-agency project runs ₹{featuredScenario.source.buffer_cr.toFixed(2)} Cr under its original cost.</span></li>
                )}
                <li className="flex gap-3"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-prism-500" aria-hidden />Officials act a report earlier, with a sourced note. The decision and approval stay with them.</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* 3. Official portfolio */}
      <section aria-labelledby="portfolio-title">
        <SectionTitle
          id="portfolio-title"
          title="What PAIMANA monitors today"
          text={`Official totals from ${REPORT_LABEL} (${AS_OF_LABEL}), page ${official.source_page}.`}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Ongoing projects" value={formatInt(official.ongoing_projects)} evidence="OFFICIAL" sub={`${official.line_ministries} ministries / departments`} icon={<Layers className="size-4" aria-hidden />} info="Central projects of ₹150 crore and above." />
          <Stat label="Original approved cost" value={formatLakhCr(official.original_cost_cr)} evidence="OFFICIAL" icon={<IndianRupee className="size-4" aria-hidden />} />
          <Stat label="Latest revised cost" value={formatLakhCr(official.revised_cost_cr)} evidence="OFFICIAL" sub={`+${formatPct(((official.revised_cost_cr - official.original_cost_cr) / official.original_cost_cr) * 100, 1)} over original`} icon={<IndianRupee className="size-4" aria-hidden />} />
          <Stat label="Delayed vs original date" value={<CountUp value={derived.delayed_projects} />} evidence="DERIVED" sub={`median ${formatMonths(derived.median_delay_months)}`} icon={<CalendarClock className="size-4" aria-hidden />} info="Current completion date later than the originally approved date." />
        </div>
      </section>

      {/* 4. How it works */}
      <section aria-labelledby="pipeline-title">
        <SectionTitle id="pipeline-title" title="How PRISM works" text="Six steps from the official report to a decision. Open any step to see it in action." />
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Link href={s.href} className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-prism-100 hover:shadow-[var(--shadow-raised)]">
                <span className="flex items-center justify-between">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-navy-50 text-navy-800 group-hover:bg-prism-50 group-hover:text-prism-700">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span className="tabular text-xs font-semibold text-ink-subtle">Step {i + 1}</span>
                </span>
                <span className="mt-4 text-base font-semibold text-navy-950">{s.title}</span>
                <span className="mt-1.5 text-sm leading-relaxed text-ink-muted">{s.text}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* 5. This month */}
      <section aria-labelledby="month-title">
        <SectionTitle id="month-title" title={`What PRISM sees in ${AS_OF_LABEL}`} text="This month's results: overall risk, the top project, and one budget option." />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader title="Risk across all projects" description="Chance of a completion-date revision in the next report" action={<EvidenceTag kind="MODEL ESTIMATE" />} />
            <CardBody>
              <BandDistribution counts={derived.risk_bands} compact />
              <p className="mt-4 text-sm text-ink-muted">
                <strong className="tabular text-ink">{formatInt(derived.risk_bands.high)}</strong> projects need attention first.
              </p>
              <LinkButton href="/command-center/" variant="ghost" size="sm" className="-ml-3 mt-2">
                View the priority list <ArrowRight className="size-4" aria-hidden />
              </LinkButton>
            </CardBody>
          </Card>

          {heroProject && (
            <Card>
              <CardHeader title="Flagged: highest priority" description={`${heroProject.code} · ${heroProject.agency}`} action={<EvidenceTag kind="MODEL ESTIMATE" />} />
              <CardBody>
                <div className="flex flex-col items-center text-center">
                  <RiskGauge score={heroProject.risk.score} band={heroProject.risk.band} size={150} />
                  <p className="mt-3 font-semibold text-navy-950">{heroProject.name}</p>
                  <p className="mt-1 text-sm text-ink-muted">{heroProject.risk.drivers.find((d) => d.direction === "raises")?.text}</p>
                </div>
                <LinkButton href={`/projects/${heroProject.code}/`} variant="ghost" size="sm" className="-ml-3 mt-3">
                  Why is it at risk? <ArrowRight className="size-4" aria-hidden />
                </LinkButton>
              </CardBody>
            </Card>
          )}

          {featuredScenario && (
            <Card>
              <CardHeader title="Budget option in the same agency" description={featuredScenario.ministry} />
              <CardBody>
                <ScenarioTeaser s={featuredScenario} />
              </CardBody>
            </Card>
          )}
        </div>
      </section>

      {/* 6. Evidence */}
      <section aria-labelledby="evidence-title">
        <SectionTitle id="evidence-title" title="Tested, not assumed" text="Checked against a month the model had never seen." />
        <div className="mx-auto max-w-4xl rounded-2xl border border-line bg-surface px-6 py-8 shadow-[var(--shadow-card)] sm:px-10">
          <dl className="grid gap-6 text-center sm:grid-cols-3">
            <div>
              <dt className="text-sm text-ink-subtle">High-band projects revised next month</dt>
              <dd className="tabular mt-2 text-3xl font-semibold text-navy-950">{t.high_correct} / {t.high_flagged}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-subtle">Precision of the High band</dt>
              <dd className="tabular mt-2 text-3xl font-semibold text-navy-950">{formatPct(t.high_precision * 100)}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-subtle">Figures cross-checked vs printed totals</dt>
              <dd className="tabular mt-2 text-3xl font-semibold text-navy-950">{evidence.data.reconciliation.passed}/{evidence.data.reconciliation.checks}</dd>
            </div>
          </dl>
          <div className="mt-8 flex justify-center">
            <LinkButton href="/evidence/" variant="secondary">
              <Scale className="size-4" aria-hidden /> See the evidence
            </LinkButton>
          </div>
        </div>
      </section>

      {/* 7. Ask */}
      <section className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 rounded-2xl bg-prism-50 px-6 py-6 ring-1 ring-inset ring-prism-100 sm:px-8">
        <p className="flex items-center gap-2 text-[15px] text-prism-800">
          <MessageSquareText className="size-4" aria-hidden />
          Have a question? Ask PRISM — answers come only from the prototype data, with sources.
        </p>
        <LinkButton href="/ask/" variant="accent" size="sm">Ask PRISM</LinkButton>
      </section>
    </div>
  );
}
