import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
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
import { Card, CardBody, CardHeader, LinkButton } from "@/components/ui/primitives";
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

function HeroArt() {
  // One beam of monitoring data enters the prism and leaves as risk, reasons and options.
  return (
    <svg viewBox="0 0 360 240" className="h-auto w-full max-w-md" aria-hidden>
      <line x1="0" y1="138" x2="142" y2="122" stroke="#a8a8a3" strokeWidth="2" strokeLinecap="round" />
      <text x="4" y="160" fill="#63635f" fontSize="11" letterSpacing="1.5">PAIMANA DATA</text>
      <path d="M180 34 L262 190 H98 Z" fill="#ffffff" stroke="#0a0a0a" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="214" y1="112" x2="352" y2="56" stroke="#0a0a0a" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="218" y1="124" x2="352" y2="124" stroke="#e8871e" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="214" y1="136" x2="352" y2="192" stroke="#8a8a85" strokeWidth="2.2" strokeLinecap="round" />
      <text x="292" y="48" fill="#0a0a0a" fontSize="13" fontStyle="italic" fontFamily="var(--font-serif)">Risk</text>
      <text x="292" y="116" fill="#86480b" fontSize="13" fontStyle="italic" fontFamily="var(--font-serif)">Reasons</text>
      <text x="292" y="212" fill="#4d4d4a" fontSize="13" fontStyle="italic" fontFamily="var(--font-serif)">Options</text>
    </svg>
  );
}

export default function OverviewPage() {
  const { official, derived } = portfolio;
  const t = evidence.test;
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="animate-rise relative overflow-hidden rounded-[28px] border border-line bg-surface" aria-labelledby="hero-title">
        <div className="relative grid items-center gap-10 px-6 py-12 sm:px-12 lg:grid-cols-[1.2fr_1fr] lg:py-20">
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
              PAIMANA tells you what happened. <span className="text-ink">PRISM tells you where to act next, why, and what options exist.</span>
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
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

      {/* Persona: before / after (solution document §3.2–3.3) */}
      <section aria-labelledby="persona-title" className="grid gap-6 lg:grid-cols-[1fr_1.1fr_1.1fr]">
        <div className="flex flex-col justify-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-subtle">Meet Meera · Program Director, IPMD</p>
          <h2 id="persona-title" className="mt-2 text-balance text-3xl font-normal tracking-[-0.02em] text-ink">
            Accountable for {formatInt(official.ongoing_projects)} projects worth ₹{(official.revised_cost_cr / 1e5).toFixed(2)} lakh crore.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Today&apos;s reports tell her what already went wrong. PRISM gives her a ranked, explained, evidence-backed shortlist of where to intervene — and where budget headroom already exists.
          </p>
          <p className="mt-3 text-xs text-ink-subtle">Illustrative persona — a role, not a real official.</p>
        </div>
        <Card className="bg-canvas">
          <CardHeader eyebrow="Before · today" title="Every project looks equally urgent" />
          <CardBody>
            <ul className="space-y-3 text-sm text-ink-muted">
              <li className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-subtle" aria-hidden />A {REPORT_LABEL} PDF with {formatInt(official.ongoing_projects)} rows, one after another.</li>
              <li className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-subtle" aria-hidden />A completion-date slip is visible only after it has been recorded — {formatInt(derived.delayed_projects)} projects are already late.</li>
              <li className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-subtle" aria-hidden />No view of where money to fix a problem could come from.</li>
            </ul>
          </CardBody>
        </Card>
        <Card className="border-prism-100 ring-1 ring-prism-100">
          <CardHeader eyebrow="After · with PRISM" title="A shortlist with reasons and options" />
          <CardBody>
            <ul className="space-y-3 text-sm text-ink-muted">
              <li className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-prism-500" aria-hidden /><span><strong className="text-ink">{formatInt(derived.risk_bands.high)} projects flagged High</strong>, each with its top three reasons.</span></li>
              {heroProject && featuredScenario && (
                <li className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-prism-500" aria-hidden /><span><Link href={`/projects/${heroProject.code}/`} className="font-semibold text-prism-700 hover:underline">{heroProject.name}</Link> scores {heroProject.risk.score.toFixed(1)}/10 — and a same-agency project runs ₹{featuredScenario.source.buffer_cr.toFixed(2)} Cr under its original cost.</span></li>
              )}
              <li className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-prism-500" aria-hidden />She acts a report earlier, with a sourced note — the decision and approval stay with officials.</li>
            </ul>
          </CardBody>
        </Card>
      </section>

      {/* Official portfolio */}
      <section aria-labelledby="portfolio-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="portfolio-title" className="text-2xl font-normal tracking-[-0.02em] text-ink">What PAIMANA monitors today</h2>
            <p className="text-sm text-ink-muted">Official totals from {REPORT_LABEL} ({AS_OF_LABEL}), page {official.source_page}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Ongoing projects" value={formatInt(official.ongoing_projects)} evidence="OFFICIAL" sub={`${official.line_ministries} ministries / departments`} icon={<Layers className="size-4" aria-hidden />} info="Central projects of ₹150 crore and above." />
          <Stat label="Original approved cost" value={formatLakhCr(official.original_cost_cr)} evidence="OFFICIAL" icon={<IndianRupee className="size-4" aria-hidden />} />
          <Stat label="Latest revised cost" value={formatLakhCr(official.revised_cost_cr)} evidence="OFFICIAL" sub={`+${formatPct(((official.revised_cost_cr - official.original_cost_cr) / official.original_cost_cr) * 100, 1)} over original`} icon={<IndianRupee className="size-4" aria-hidden />} />
          <Stat label="Delayed vs original date" value={<CountUp value={derived.delayed_projects} />} evidence="DERIVED" sub={`median ${formatMonths(derived.median_delay_months)}`} icon={<CalendarClock className="size-4" aria-hidden />} info="Current completion date later than the originally approved date." />
        </div>
      </section>

      {/* PAIMANA vs PRISM */}
      <section aria-labelledby="layer-title" className="grid gap-6 lg:grid-cols-2">
        <h2 id="layer-title" className="sr-only">What PRISM adds</h2>
        <Card>
          <CardHeader eyebrow="PAIMANA · monitoring" title="What happened" />
          <CardBody>
            <ul className="space-y-2.5 text-sm text-ink-muted">
              {["Monthly Flash Report of every ₹150 Cr+ central project", "Costs, expenditure, progress and dates as reported", "Delays and overruns visible after they are recorded"].map((x) => (
                <li key={x} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-navy-700" aria-hidden />{x}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card className="border-prism-100 ring-1 ring-prism-100">
          <CardHeader eyebrow="PRISM · intelligence layer" title="Where to act next" />
          <CardBody>
            <ul className="space-y-2.5 text-sm text-ink-muted">
              {["An early warning before the next date revision is recorded", "The reasons behind every score — no black box", "Budget options inside the same ministry, with the approval caveat"].map((x) => (
                <li key={x} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-prism-500" aria-hidden />{x}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </section>

      {/* Pipeline */}
      <section aria-labelledby="pipeline-title">
        <h2 id="pipeline-title" className="mb-4 text-2xl font-normal tracking-[-0.02em] text-ink">How PRISM turns data into decisions</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <Link href={s.href} className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-prism-100 hover:shadow-[var(--shadow-raised)]">
                <span className="flex items-center justify-between">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-navy-50 text-navy-800 group-hover:bg-prism-50 group-hover:text-prism-700">
                    <s.icon className="size-4.5" aria-hidden />
                  </span>
                  <span className="tabular text-xs font-semibold text-ink-subtle">0{i + 1}</span>
                </span>
                <span className="mt-3 text-sm font-semibold text-navy-950">{s.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-ink-muted">{s.text}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* This month */}
      <section aria-labelledby="month-title">
        <h2 id="month-title" className="mb-4 text-2xl font-normal tracking-[-0.02em] text-ink">What PRISM sees in {AS_OF_LABEL}</h2>
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

      {/* Evidence strip */}
      <section aria-labelledby="evidence-title" className="rounded-2xl border border-line bg-surface px-6 py-6 shadow-[var(--shadow-card)] sm:px-8">
        <div className="grid items-center gap-6 lg:grid-cols-[1.2fr_2fr_auto]">
          <div>
            <p className="text-sm font-semibold text-prism-700">Tested, not assumed</p>
            <h2 id="evidence-title" className="mt-1 text-lg font-semibold text-navy-950">Checked against a month it had never seen</h2>
          </div>
          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-xs text-ink-subtle">High-band projects revised next month</dt>
              <dd className="tabular mt-1 text-2xl font-semibold text-navy-950">{t.high_correct} / {t.high_flagged}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">Precision of the High band</dt>
              <dd className="tabular mt-1 text-2xl font-semibold text-navy-950">{formatPct(t.high_precision * 100)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">Figures cross-checked vs printed totals</dt>
              <dd className="tabular mt-1 text-2xl font-semibold text-navy-950">{evidence.data.reconciliation.passed}/{evidence.data.reconciliation.checks}</dd>
            </div>
          </dl>
          <LinkButton href="/evidence/" variant="secondary">
            <Scale className="size-4" aria-hidden /> Evidence
          </LinkButton>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-prism-50 px-6 py-5 ring-1 ring-inset ring-prism-100 sm:px-8">
        <p className="flex items-center gap-2 text-sm text-prism-800">
          <MessageSquareText className="size-4" aria-hidden />
          Have a question? Ask PRISM — answers come only from the prototype data, with sources.
        </p>
        <LinkButton href="/ask/" variant="accent" size="sm">Ask PRISM</LinkButton>
      </section>
    </div>
  );
}
