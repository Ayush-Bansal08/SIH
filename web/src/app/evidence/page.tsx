import { NextStep } from "@/components/layout/NextStep";
import { ChevronDown, Database, FileText, FlaskConical, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Stat, table } from "@/components/ui/data";
import { Badge, Card, CardBody, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { BAND_STYLE } from "@/components/ui/risk";
import { evidence, portfolio } from "@/lib/data";
import { formatInt, formatMonth, formatPct } from "@/lib/format";
import { BAND_META } from "@/lib/labels";

export const metadata: Metadata = { title: "Evidence" };

const MODEL_ROWS = [
  { key: "rule", label: "Rule of thumb", sub: "target date within a month or passed", track: "Baseline" },
  { key: "cox", label: "Cox survival model", sub: "recurrent delay events", track: "Statistical" },
  { key: "logit", label: "Logistic regression", sub: "multivariate", track: "Statistical" },
  { key: "fused", label: "PRISM fused score", sub: "logistic + Cox + XGBoost", track: "Fused" },
  { key: "xgb", label: "XGBoost", sub: "gradient-boosted trees", track: "ML" },
  { key: "rf", label: "Random forest", sub: "comparator (not fused)", track: "ML" },
] as const;

const TRACK_COLOR: Record<string, string> = { Baseline: "#9ca3af", Statistical: "#171717", ML: "#8a8a85", Fused: "#e8871e" };

/** One idea per section, with room around it. */
function Section({ id, title, text, children }: { id: string; title: string; text?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-28">
      <SectionTitle id={id} title={title} text={text} />
      <div className="mx-auto max-w-5xl space-y-6">{children}</div>
    </section>
  );
}

/** Detail that most readers can skip (native <details>: keyboard and screen-reader friendly). */
function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-5 shrink-0 text-ink-subtle transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-line">{children}</div>
    </details>
  );
}

export default function EvidencePage() {
  const t = evidence.test;
  const p = evidence.protocol;
  const cuf = evidence.cuf_comparison;
  const cc = evidence.cause_check;
  const months = [...p.train_months, p.calibration_month, p.test_month, p.test_label_month];
  const role = (m: string) =>
    p.train_months.includes(m) ? ["Train", "models learn from these reports", "bg-navy-800 text-white"]
      : m === p.calibration_month ? ["Calibrate", "probabilities and fusion weights set", "bg-prism-600 text-white"]
      : m === p.test_month ? ["Test", "scored once, never seen in training", "bg-saffron-500 text-navy-950"]
      : ["Outcome", "did the date actually move?", "bg-risk-low text-white"];
  const drivers = evidence.driver_importance.slice(0, 10);
  const maxShare = Math.max(...drivers.map((d) => d.share));
  const dq = evidence.data.data_quality;
  const rules = [...evidence.data.dq_rules].sort((a, b) => b.findings - a.findings).slice(0, 8);
  const low = t.bands.find((b) => b.band === "low");

  return (
    <div className="space-y-24 pb-8 sm:space-y-32">
      <div className="space-y-10">
        <PageHeader
          eyebrow="Evidence"
          title="Tested, not assumed"
          description="How PRISM's score was checked against a month it had never seen, and how every figure traces back to an official report."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="High-band projects actually revised" value={`${t.high_correct} of ${t.high_flagged}`} evidence="MODEL ESTIMATE" sub={`${formatPct(t.high_precision * 100)} precision, one report ahead`} emphasis />
          <Stat label="Revisions caught in advance" value={formatPct(t.high_recall * 100)} evidence="MODEL ESTIMATE" sub={`${t.high_correct} of ${t.positives} date revisions`} />
          <Stat label="Ranking accuracy (AUC)" value={t.auc.fused.toFixed(2)} evidence="MODEL ESTIMATE" sub={`vs ${t.auc.rule.toFixed(2)} for a rule of thumb`} info="Chance that a project whose date was revised is ranked above one whose date was not. 0.5 is a coin flip; 1.0 is perfect." />
          <Stat label="Figures cross-checked" value={`${evidence.data.reconciliation.passed}/${evidence.data.reconciliation.checks}`} evidence="OFFICIAL" sub="against the reports' own printed totals" />
        </div>
      </div>

      {/* 1. Backtest */}
      <Section
        id="protocol"
        title="Checked against a month it had never seen"
        text={<>{evidence.question} The models learned only from earlier reports, then scored every project in the {formatMonth(p.test_month)} report once.</>}
      >
        <ol className="grid gap-3 sm:grid-cols-5">
          {months.map((m) => {
            const [name, text, cls] = role(m);
            return (
              <li key={m} className="overflow-hidden rounded-2xl border border-line bg-surface">
                <p className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide ${cls}`}>{name}</p>
                <div className="px-4 py-3">
                  <p className="font-semibold text-navy-950">{formatMonth(m)}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{text}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <Card>
          <CardBody className="px-6 py-7 sm:px-8">
            <p className="text-lg font-normal text-ink">Are the bands honest?</p>
            <p className="mt-1 text-sm text-ink-muted">Upper bar: the average chance PRISM predicted. Lower bar: the share whose date really was pushed back.</p>
            <ul className="mt-6 space-y-5">
              {t.bands.map((b) => {
                const S = BAND_STYLE[b.band];
                return (
                  <li key={b.band}>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                        <S.Icon className={`size-4 ${S.text}`} aria-hidden />
                        {BAND_META[b.band].label} <span className="font-normal text-ink-subtle">({formatInt(b.n)} projects)</span>
                      </span>
                      <span className="tabular text-ink-muted">
                        predicted {formatPct((b.mean_predicted ?? 0) * 100)} · <strong className="text-ink">happened {formatPct((b.observed_rate ?? 0) * 100)}</strong>
                      </span>
                    </div>
                    <div className="space-y-1" aria-hidden>
                      <div className="h-2 rounded-full bg-line"><div className="h-full rounded-full bg-navy-100" style={{ width: `${(b.mean_predicted ?? 0) * 100}%` }} /></div>
                      <div className="h-2 rounded-full bg-line"><div className="h-full rounded-full" style={{ width: `${(b.observed_rate ?? 0) * 100}%`, background: S.fill }} /></div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
        <p className="mx-auto max-w-3xl text-center text-[15px] leading-relaxed text-ink-muted">
          <strong className="text-ink">What this means:</strong> of the {t.high_flagged} projects PRISM would have put at the top of the list in {formatMonth(p.test_month)},{" "}
          {t.high_correct} ({formatPct(t.high_precision * 100)}) had their completion date officially pushed back one month later. The Low band held{" "}
          {formatInt(low?.n ?? 0)} projects, of which only {formatPct((low?.observed_rate ?? 0) * 100)} were revised.
        </p>
      </Section>

      {/* 2. Statistics vs ML */}
      <Section id="statml" title="Statistics and machine learning, tested side by side" text="Ranking accuracy (AUC) on the test month. 0.5 is a coin flip; 1.0 is perfect.">
        <Card>
          <CardBody className="px-6 py-7 sm:px-8">
            <ul className="space-y-5">
              {MODEL_ROWS.map((r) => {
                const v = t.auc[r.key];
                return (
                  <li key={r.key}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span>
                        <span className={r.key === "fused" ? "font-semibold text-navy-950" : "font-medium text-ink"}>{r.label}</span>{" "}
                        <span className="text-ink-subtle">· {r.sub}</span>
                      </span>
                      <span className="tabular font-semibold text-navy-950">{v.toFixed(3)}</span>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-line" aria-hidden>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(2, ((v - 0.5) / 0.5) * 100)}%`, background: TRACK_COLOR[r.track] }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-ink-muted">
              {Object.entries(TRACK_COLOR).map(([k, c]) => (
                <span key={k} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: c }} aria-hidden />{k}</span>
              ))}
            </div>
          </CardBody>
        </Card>
        <div className="mx-auto max-w-3xl space-y-4 text-[15px] leading-relaxed text-ink-muted">
          <p><strong className="text-ink">Verdict:</strong> {evidence.stat_vs_ml.verdict}</p>
          <p>
            <strong className="text-ink">Why fuse at all?</strong> XGBoost alone ranks slightly better, but the fused score keeps two statistical opinions in the loop and splits exactly
            into plain-language reasons. Weights: logistic {formatPct(evidence.fusion_weights.logit * 100)}, Cox {formatPct(evidence.fusion_weights.cox * 100)}, XGBoost{" "}
            {formatPct(evidence.fusion_weights.xgb * 100)}, set by accuracy on the held-out month.
          </p>
        </div>
        <Fold title={`See all metrics (${formatInt(t.n)} projects, ${t.positives} date revisions)`}>
          <div className="overflow-x-auto">
            <table className={table.table}>
              <caption className="sr-only">Statistical versus machine-learning models on the unseen test month</caption>
              <thead className={table.thead}>
                <tr>
                  <th scope="col" className={`${table.th} px-6`}>Metric</th>
                  <th scope="col" className={`${table.th} text-right`}>Logistic</th>
                  <th scope="col" className={`${table.th} text-right`}>Cox</th>
                  <th scope="col" className={`${table.th} text-right`}>XGBoost</th>
                  <th scope="col" className={`${table.th} text-right`}>Fused</th>
                  <th scope="col" className={`${table.th} text-right`}>Rule</th>
                  <th scope="col" className={`${table.th} px-6`}>Better</th>
                </tr>
              </thead>
              <tbody>
                {evidence.stat_vs_ml.rows.map((r) => (
                  <tr key={r.metric} className={table.tr}>
                    <th scope="row" className={`${table.td} px-6 text-left font-medium text-ink`}>{r.metric}</th>
                    <td className={`${table.td} ${table.num}`}>{r.logistic.toFixed(3)}</td>
                    <td className={`${table.td} ${table.num}`}>{r.cox.toFixed(3)}</td>
                    <td className={`${table.td} ${table.num}`}>{r.xgboost.toFixed(3)}</td>
                    <td className={`${table.td} ${table.num} font-semibold`}>{r.fused.toFixed(3)}</td>
                    <td className={`${table.td} ${table.num} text-ink-subtle`}>{r.rule_of_thumb.toFixed(3)}</td>
                    <td className={`${table.td} px-6`}><Badge tone={r.better_track === "ML" ? "info" : "brand"}>{r.better_track}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-6 py-4 text-xs text-ink-subtle">Differences come with 95% confidence intervals from a cluster bootstrap over projects (the 26 BharatNet sub-projects count as one).</p>
        </Fold>
      </Section>

      {/* 3. Drivers */}
      <Section
        id="drivers"
        title="What drives the scores"
        text={`Share of the explanation weight, averaged over all ${formatInt(portfolio.official.ongoing_projects)} scored projects.`}
      >
        <Card>
          <CardBody className="px-6 py-7 sm:px-8">
            <ul className="space-y-3.5">
              {drivers.map((d) => (
                <li key={d.driver} className="grid grid-cols-[minmax(0,14rem)_1fr_3rem] items-center gap-4 text-sm">
                  <span className="truncate text-ink" title={d.label}>{d.label}</span>
                  <span className="h-2.5 rounded-full bg-line" aria-hidden>
                    <span className="block h-full rounded-full" style={{ width: `${(d.share / maxShare) * 100}%`, background: d.data === "CUF" ? "#171717" : "#8a8a85" }} />
                  </span>
                  <span className="tabular text-right text-ink-muted">{formatPct(d.share * 100)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-ink-subtle">Each score splits exactly into these factors (TreeSHAP for XGBoost, linear terms for the statistical models).</p>
          </CardBody>
        </Card>
        <div className="mx-auto max-w-3xl space-y-4 text-[15px] leading-relaxed text-ink-muted">
          <p>
            <strong className="text-ink">Honest finding:</strong> deadline pressure dominates. The public Flash Report records <em>when</em> a project is due and how far along it is,
            but not <em>why</em> it is late, so published root causes such as land acquisition and forest clearance cannot be measured from today&apos;s fields.
          </p>
          <p>
            <strong className="text-ink">Check against published causes:</strong> of the {cc.flagged_high} High-band projects, the top reason matched an observable proxy of a
            published cause in <strong className="tabular text-ink">{formatPct((cc.share_top_driver ?? 0) * 100)}</strong> of cases, and any of the top three in{" "}
            <strong className="tabular text-ink">{formatPct((cc.share_any_top3 ?? 0) * 100, 1)}</strong>. A low match is expected, and it is why PRISM recommends a
            cause-of-delay field.
          </p>
          <p className="text-xs text-ink-subtle">Published causes (J. Inst. Eng. India A): {cc.published_causes.join(", ")}.</p>
        </div>
      </Section>

      {/* 4. CUF vs non-CUF */}
      <Section
        id="cuf"
        title="What the current fields miss"
        text={`Delay rates for signals found in project names, which are not CUF fields. All ${formatInt(cuf.baseline.projects)} ongoing projects; baseline ${formatPct(cuf.baseline.share_delayed * 100)} delayed.`}
      >
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className={table.table}>
              <caption className="sr-only">Share of projects delayed, by signal parsed from the project name</caption>
              <thead className={table.thead}>
                <tr>
                  <th scope="col" className={`${table.th} px-6`}>Signal in the project name</th>
                  <th scope="col" className={`${table.th} text-right`}>Projects</th>
                  <th scope="col" className={table.th}>Delayed vs original date</th>
                  <th scope="col" className={`${table.th} px-6 text-right`}>Median delay</th>
                </tr>
              </thead>
              <tbody>
                {cuf.signals.map((s) => {
                  const up = s.difference_pts > 0;
                  return (
                    <tr key={s.key} className={table.tr}>
                      <th scope="row" className={`${table.td} px-6 py-4 text-left font-medium text-ink`}>{s.signal}</th>
                      <td className={`${table.td} ${table.num} py-4`}>{s.projects}</td>
                      <td className={`${table.td} py-4`}>
                        <div className="flex items-center gap-2">
                          <div className="relative h-2.5 w-28 rounded-full bg-line" aria-hidden>
                            <div className="h-full rounded-full" style={{ width: `${s.share_delayed * 100}%`, background: up ? "#b42318" : "#17b26a" }} />
                            <div className="absolute -top-1 h-4.5 w-0.5 bg-navy-950" style={{ left: `${cuf.baseline.share_delayed * 100}%` }} />
                          </div>
                          <span className="tabular w-10 text-right font-semibold text-ink">{formatPct(s.share_delayed * 100)}</span>
                          <span className={`tabular whitespace-nowrap text-xs ${up ? "text-risk-high" : "text-risk-low"}`}>{up ? "+" : ""}{s.difference_pts.toFixed(0)} pts</span>
                        </div>
                      </td>
                      <td className={`${table.td} ${table.num} px-6 py-4`}>{s.median_delay_months} mo</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-6 py-4 text-xs text-ink-subtle">
            Black tick = portfolio baseline ({formatPct(cuf.baseline.share_delayed * 100)}). {cuf.note}
          </p>
        </Card>

        <Card className="border-prism-100 ring-1 ring-prism-100">
          <CardBody className="px-6 py-7 sm:px-8">
            <p className="text-lg font-normal text-ink">Recommended new fields</p>
            <p className="mt-1 text-sm text-ink-muted">Evidence-backed candidates for the Common Upload Form</p>
            <ul className="mt-6 grid gap-x-10 gap-y-5 md:grid-cols-2">
              {cuf.recommended_fields.map((r) => (
                <li key={r.field} className="text-sm">
                  <p className="font-semibold text-navy-950">{r.field}</p>
                  <p className="mt-0.5 leading-relaxed text-ink-muted">{r.evidence}</p>
                </li>
              ))}
            </ul>
            <div className="mt-7 border-t border-line pt-5">
              <p className="text-sm text-ink-muted">Today the model uses {cuf.cuf_fields.length} CUF fields:</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {cuf.cuf_fields.map((f) => <Badge key={f} tone="brand">{f}</Badge>)}
              </div>
            </div>
          </CardBody>
        </Card>

        <Fold title="External data (weather, prices, elections): where it stands">
          <div className="overflow-x-auto">
            <table className={table.table}>
              <caption className="sr-only">Status of external data sources in this prototype</caption>
              <tbody>
                {cuf.external_data.map((e) => (
                  <tr key={e.indicator} className={table.tr}>
                    <th scope="row" className={`${table.td} px-6 text-left font-medium text-ink`}>{e.indicator}</th>
                    <td className={table.td}><Badge tone="neutral">{e.status}</Badge></td>
                    <td className={`${table.td} px-6 text-ink-muted`}>{e.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Fold>
      </Section>

      {/* 5. Data */}
      <Section id="data" title="Every figure traces back to an official report" text="Extracted from five public Flash Reports, checked against their own totals, and flagged — never changed — when something looks wrong.">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardBody className="space-y-2 px-6 py-6 text-sm text-ink-muted">
              <p className="flex items-center gap-2 font-medium text-ink"><ShieldCheck className="size-4 text-risk-low" aria-hidden /> Reconciliation</p>
              <p className="tabular pt-2 text-3xl font-semibold text-navy-950">{evidence.data.reconciliation.passed} / {evidence.data.reconciliation.checks}</p>
              <p className="leading-relaxed">checks pass: every overview total, ministry total, sector subtotal and project count matches the totals the reports themselves print.</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-3 px-6 py-6 text-sm">
              <p className="flex items-center gap-2 font-medium text-ink"><FlaskConical className="size-4 text-ink-subtle" aria-hidden /> Data-quality flags</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge tone="danger">{dq.error} errors</Badge>
                <Badge tone="warning">{dq.warning} warnings</Badge>
                <Badge tone="neutral">{dq.info} info</Badge>
              </div>
              <ul className="space-y-1.5">
                {rules.map((r) => (
                  <li key={r.rule} className="flex items-baseline justify-between gap-3">
                    <span className="text-ink-muted"><span className="font-mono text-xs text-ink-subtle">{r.rule}</span> {r.title}</span>
                    <span className="tabular font-semibold text-ink">{r.findings}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-2 px-6 py-6 text-sm text-ink-muted">
              <p className="flex items-center gap-2 font-medium text-ink"><Database className="size-4 text-ink-subtle" aria-hidden /> Reporting lag</p>
              <p className="tabular pt-2 text-3xl font-semibold text-navy-950">{evidence.data.reporting_lag.median_lag_months.toFixed(1)} months</p>
              <p className="leading-relaxed">
                median gap between a project&apos;s actual completion and its appearance as “completed” ({formatPct(evidence.data.reporting_lag.share_over_12_months * 100)} over a
                year). PRISM raises a status-check alert for these.
              </p>
            </CardBody>
          </Card>
        </div>
        <Card>
          <div className="border-b border-line px-6 py-4">
            <p className="font-medium text-ink">Source documents</p>
            <p className="text-sm text-ink-muted">PAIMANA monthly Flash Reports, fingerprinted with SHA-256</p>
          </div>
          <ul className="divide-y divide-line">
            {evidence.data.sources.map((s) => (
              <li key={s.file} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm">
                <span className="flex items-center gap-2 font-medium text-ink"><FileText className="size-4 text-ink-subtle" aria-hidden />{s.label}</span>
                <span className="font-mono text-xs text-ink-subtle" title={s.sha256}>sha256 {s.sha256.slice(0, 16)}…</span>
                <a href={s.origin} target="_blank" rel="noreferrer" className="text-xs font-medium text-prism-700 hover:underline">paimana-proj.mospi.gov.in/ReportPage</a>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      {/* 6. Limits */}
      <Section id="limits" title="What this prototype does not claim">
        <Card className="mx-auto max-w-3xl">
          <CardBody className="px-6 py-7 sm:px-8">
            <ul className="space-y-3.5 text-[15px] leading-relaxed text-ink-muted">
              {evidence.limits.map((l) => (
                <li key={l} className="flex gap-3"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-saffron-500" aria-hidden />{l}</li>
              ))}
            </ul>
            <p className="mt-6 border-t border-line pt-5 text-xs text-ink-subtle">
              Scored {formatInt(evidence.scoring_time.projects)} projects in {evidence.scoring_time.seconds.toFixed(2)} s ({evidence.scoring_time.hardware}). Generated{" "}
              {evidence.generated_at.slice(0, 10)}.
            </p>
          </CardBody>
        </Card>
      </Section>

      <NextStep href="/ask/" question="Have a question about a project or the portfolio?" label="Ask PRISM — grounded answers with sources" />
    </div>
  );
}
