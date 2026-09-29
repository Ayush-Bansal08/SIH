import { NextStep } from "@/components/layout/NextStep";
import { CheckCircle2, Database, FileText, FlaskConical, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Stat, table } from "@/components/ui/data";
import { Badge, Callout, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/primitives";
import { BAND_STYLE, EvidenceTag } from "@/components/ui/risk";
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

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-28 space-y-4">
      <div>
        <p className="text-sm font-semibold text-prism-700">{eyebrow}</p>
        <h2 id={id} className="text-xl font-semibold text-navy-950">{title}</h2>
      </div>
      {children}
    </section>
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

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Evidence"
        title="Tested, not assumed"
        description="How PRISM's score was checked against a month it had never seen, how statistics compared with machine learning, what drives the scores, and how every figure traces back to an official report."
        meta={<><EvidenceTag kind="OFFICIAL" /><EvidenceTag kind="DERIVED" /><EvidenceTag kind="MODEL ESTIMATE" /></>}
      />

      {/* Headline */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="High-band projects actually revised" value={`${t.high_correct} of ${t.high_flagged}`} evidence="MODEL ESTIMATE" sub={`${formatPct(t.high_precision * 100)} precision, one report ahead`} emphasis />
        <Stat label="Revisions caught in advance" value={formatPct(t.high_recall * 100)} evidence="MODEL ESTIMATE" sub={`${t.high_correct} of ${t.positives} date revisions`} />
        <Stat label="Ranking accuracy (AUC)" value={t.auc.fused.toFixed(2)} evidence="MODEL ESTIMATE" sub={`vs ${t.auc.rule.toFixed(2)} for a rule of thumb`} info="Chance that a project whose date was revised is ranked above one whose date was not. 0.5 is a coin flip; 1.0 is perfect." />
        <Stat label="Figures cross-checked" value={`${evidence.data.reconciliation.passed}/${evidence.data.reconciliation.checks}`} evidence="OFFICIAL" sub="against the reports' own printed totals" />
      </div>

      {/* Protocol */}
      <Section id="protocol" eyebrow="1 · Backtest" title="Checked against a month it had never seen">
        <Card>
          <CardBody className="space-y-5">
            <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
              <strong className="text-ink">The question:</strong> {evidence.question} The models learned only from earlier reports, then scored every project in the {formatMonth(p.test_month)} report once. The {formatMonth(p.test_label_month)} report then showed which completion dates were actually pushed back.
            </p>
            <ol className="grid gap-2 sm:grid-cols-5">
              {months.map((m) => {
                const [name, text, cls] = role(m);
                return (
                  <li key={m} className="overflow-hidden rounded-lg border border-line">
                    <p className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${cls}`}>{name}</p>
                    <div className="px-3 py-2">
                      <p className="font-semibold text-navy-950">{formatMonth(m)}</p>
                      <p className="text-xs text-ink-muted">{text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold text-navy-950">Are the bands honest? Predicted vs what happened</p>
                <ul className="space-y-3">
                  {t.bands.map((b) => (
                    <li key={b.band}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                          {(() => { const S = BAND_STYLE[b.band]; return <S.Icon className={`size-4 ${S.text}`} aria-hidden />; })()}
                          {BAND_META[b.band].label} <span className="font-normal text-ink-subtle">({formatInt(b.n)} projects)</span>
                        </span>
                        <span className="tabular text-xs text-ink-muted">
                          predicted {formatPct((b.mean_predicted ?? 0) * 100)} · <strong className="text-ink">happened {formatPct((b.observed_rate ?? 0) * 100)}</strong>
                        </span>
                      </div>
                      <div className="space-y-1" aria-hidden>
                        <div className="h-2 rounded-full bg-line"><div className="h-full rounded-full bg-navy-100" style={{ width: `${(b.mean_predicted ?? 0) * 100}%` }} /></div>
                        <div className="h-2 rounded-full bg-line"><div className="h-full rounded-full" style={{ width: `${(b.observed_rate ?? 0) * 100}%`, background: BAND_STYLE[b.band].fill }} /></div>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-ink-subtle">Upper bar: average predicted chance. Lower bar: share whose date was actually revised in the next report.</p>
              </div>
              <Callout tone="info" className="self-start" icon={<CheckCircle2 className="size-4" aria-hidden />} title="What this means for a Program Director">
                Of the {t.high_flagged} projects PRISM would have put at the top of the list in {formatMonth(p.test_month)}, {t.high_correct} ({formatPct(t.high_precision * 100)}) had their completion date officially pushed back one month later — attention spent on the High band is rarely wasted. The Low band held {formatInt(t.bands.find((b) => b.band === "low")?.n ?? 0)} projects, of which only {formatPct((t.bands.find((b) => b.band === "low")?.observed_rate ?? 0) * 100)} were revised.
              </Callout>
            </div>
          </CardBody>
        </Card>
      </Section>

      {/* Stat vs ML */}
      <Section id="statml" eyebrow="2 · Statistics vs machine learning" title="We tested ML against classical statistics — honestly">
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader title="Ranking accuracy on the test month" description="AUC · 0.5 = coin flip, 1.0 = perfect" />
            <CardBody>
              <ul className="space-y-3">
                {MODEL_ROWS.map((r) => {
                  const v = t.auc[r.key];
                  return (
                    <li key={r.key}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span>
                          <span className={r.key === "fused" ? "font-semibold text-navy-950" : "font-medium text-ink"}>{r.label}</span>{" "}
                          <span className="text-xs text-ink-subtle">{r.sub}</span>
                        </span>
                        <span className="tabular font-semibold text-navy-950">{v.toFixed(3)}</span>
                      </div>
                      <div className="mt-1 h-2.5 rounded-full bg-line" aria-hidden>
                        <div className="h-full rounded-full" style={{ width: `${Math.max(2, ((v - 0.5) / 0.5) * 100)}%`, background: TRACK_COLOR[r.track] }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-muted">
                {Object.entries(TRACK_COLOR).map(([k, c]) => (
                  <span key={k} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: c }} aria-hidden />{k}</span>
                ))}
              </div>
            </CardBody>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader title="Side-by-side results" description={`${formatInt(t.n)} projects, ${t.positives} completion-date revisions`} action={<EvidenceTag kind="MODEL ESTIMATE" />} />
            <div className="overflow-x-auto">
              <table className={table.table}>
                <caption className="sr-only">Statistical versus machine-learning models on the unseen test month</caption>
                <thead className={table.thead}>
                  <tr>
                    <th scope="col" className={table.th}>Metric</th>
                    <th scope="col" className={`${table.th} text-right`}>Logistic</th>
                    <th scope="col" className={`${table.th} text-right`}>Cox</th>
                    <th scope="col" className={`${table.th} text-right`}>XGBoost</th>
                    <th scope="col" className={`${table.th} text-right`}>Fused</th>
                    <th scope="col" className={`${table.th} text-right`}>Rule</th>
                    <th scope="col" className={table.th}>Better</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.stat_vs_ml.rows.map((r) => (
                    <tr key={r.metric} className={table.tr}>
                      <th scope="row" className={`${table.td} text-left font-medium text-ink`}>{r.metric}</th>
                      <td className={`${table.td} ${table.num}`}>{r.logistic.toFixed(3)}</td>
                      <td className={`${table.td} ${table.num}`}>{r.cox.toFixed(3)}</td>
                      <td className={`${table.td} ${table.num}`}>{r.xgboost.toFixed(3)}</td>
                      <td className={`${table.td} ${table.num} font-semibold`}>{r.fused.toFixed(3)}</td>
                      <td className={`${table.td} ${table.num} text-ink-subtle`}>{r.rule_of_thumb.toFixed(3)}</td>
                      <td className={table.td}><Badge tone={r.better_track === "ML" ? "info" : "brand"}>{r.better_track}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CardBody className="space-y-3 border-t border-line text-sm leading-relaxed text-ink-muted">
              <p><strong className="text-ink">Verdict:</strong> {evidence.stat_vs_ml.verdict}</p>
              <p>
                <strong className="text-ink">Why fuse at all?</strong> XGBoost alone ranks slightly better, but the fused score keeps two statistical opinions in the loop and splits exactly into plain-language reasons. Current weights: logistic {formatPct(evidence.fusion_weights.logit * 100)}, Cox {formatPct(evidence.fusion_weights.cox * 100)}, XGBoost {formatPct(evidence.fusion_weights.xgb * 100)} — set by accuracy on the held-out month.
              </p>
              <p className="text-xs">Differences come with 95% confidence intervals from a cluster bootstrap over projects (the 26 BharatNet sub-projects count as one).</p>
            </CardBody>
          </Card>
        </div>
      </Section>

      {/* Drivers */}
      <Section id="drivers" eyebrow="3 · Explanation" title="What drives the scores across the portfolio">
        <Card>
          <CardBody className="grid gap-6 lg:grid-cols-2">
            <ul className="space-y-2.5">
              {drivers.map((d) => (
                <li key={d.driver} className="grid grid-cols-[minmax(0,12rem)_1fr_3rem] items-center gap-3 text-sm">
                  <span className="truncate text-ink" title={d.label}>{d.label}</span>
                  <span className="h-2.5 rounded-full bg-line" aria-hidden>
                    <span className="block h-full rounded-full" style={{ width: `${(d.share / maxShare) * 100}%`, background: d.data === "CUF" ? "#171717" : "#8a8a85" }} />
                  </span>
                  <span className="tabular text-right text-ink-muted">{formatPct(d.share * 100)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-3 text-sm leading-relaxed text-ink-muted">
              <p>Share of total explanation weight, averaged over all {formatInt(portfolio.official.ongoing_projects)} scored projects. Each project&apos;s score splits exactly into these factors (TreeSHAP for XGBoost, linear terms for the statistical models).</p>
              <p><strong className="text-ink">Honest finding:</strong> deadline pressure dominates. The reports record <em>when</em> a project is due and how far along it is, but not <em>why</em> it is late — so published root causes such as land acquisition and forest clearance cannot be measured from today&apos;s fields. That gap is the subject of the next section.</p>
              <div className="rounded-lg border border-line bg-canvas p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Check against published root causes</p>
                <p className="mt-1.5 text-ink">
                  Of the <strong>{cc.flagged_high}</strong> High-band projects, the top reason matched an observable proxy of a published cause (price escalation, high capital cost, contractor re-tendering, land for new alignments) in{" "}
                  <strong className="tabular">{formatPct((cc.share_top_driver ?? 0) * 100)}</strong> of cases, and any of the top three in{" "}
                  <strong className="tabular">{formatPct((cc.share_any_top3 ?? 0) * 100, 1)}</strong>.
                </p>
                <p className="mt-1.5 text-xs">
                  Published causes (J. Inst. Eng. India A): {cc.published_causes.join(", ")}. A low match is expected and informative — the CUF has no cause-of-delay field, which is why PRISM recommends adding one.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </Section>

      {/* CUF vs non-CUF */}
      <Section id="cuf" eyebrow="4 · CUF vs non-CUF" title="What the current fields miss">
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader
              title="Delay rates for signals that are not CUF fields"
              description={`Parsed from project names · all ${formatInt(cuf.baseline.projects)} ongoing projects · baseline: ${formatPct(cuf.baseline.share_delayed * 100)} delayed`}
              action={<EvidenceTag kind="DERIVED" detail="Descriptive comparison: associations, not causes." />}
            />
            <div className="overflow-x-auto">
              <table className={table.table}>
                <caption className="sr-only">Share of projects delayed, by signal parsed from the project name</caption>
                <thead className={table.thead}>
                  <tr>
                    <th scope="col" className={table.th}>Signal in the project name</th>
                    <th scope="col" className={`${table.th} text-right`}>Projects</th>
                    <th scope="col" className={table.th}>Delayed vs original date</th>
                    <th scope="col" className={`${table.th} text-right`}>Median delay</th>
                  </tr>
                </thead>
                <tbody>
                  {cuf.signals.map((s) => {
                    const up = s.difference_pts > 0;
                    return (
                      <tr key={s.key} className={table.tr}>
                        <th scope="row" className={`${table.td} text-left font-medium text-ink`}>{s.signal}</th>
                        <td className={`${table.td} ${table.num}`}>{s.projects}</td>
                        <td className={table.td}>
                          <div className="flex items-center gap-2">
                            <div className="relative h-2.5 w-28 rounded-full bg-line" aria-hidden>
                              <div className="h-full rounded-full" style={{ width: `${s.share_delayed * 100}%`, background: up ? "#b42318" : "#17b26a" }} />
                              <div className="absolute -top-1 h-4.5 w-0.5 bg-navy-950" style={{ left: `${cuf.baseline.share_delayed * 100}%` }} />
                            </div>
                            <span className="tabular w-10 text-right font-semibold text-ink">{formatPct(s.share_delayed * 100)}</span>
                            <span className={`tabular whitespace-nowrap text-xs ${up ? "text-risk-high" : "text-risk-low"}`}>{up ? "+" : ""}{s.difference_pts.toFixed(0)} pts</span>
                          </div>
                        </td>
                        <td className={`${table.td} ${table.num}`}>{s.median_delay_months} mo</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <CardBody className="border-t border-line text-xs text-ink-subtle">
              Black tick = portfolio baseline ({formatPct(cuf.baseline.share_delayed * 100)}). {cuf.note}
            </CardBody>
          </Card>

          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <CardHeader title="Fields PAIMANA captures today" description={`${cuf.cuf_fields.length} CUF fields used by the model`} />
              <CardBody className="flex flex-wrap gap-1.5">
                {cuf.cuf_fields.map((f) => <Badge key={f} tone="brand">{f}</Badge>)}
              </CardBody>
            </Card>
            <Card className="border-prism-100 ring-1 ring-prism-100">
              <CardHeader title="Recommended new fields" description="Evidence-backed candidates for the Common Upload Form" />
              <CardBody>
                <ul className="space-y-3">
                  {cuf.recommended_fields.map((r) => (
                    <li key={r.field} className="text-sm">
                      <p className="font-semibold text-navy-950">{r.field}</p>
                      <p className="text-ink-muted">{r.evidence}</p>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
        <Card>
          <CardHeader title="External data (weather, prices, elections)" description="Where it stands in this prototype" />
          <div className="overflow-x-auto">
            <table className={table.table}>
              <tbody>
                {cuf.external_data.map((e) => (
                  <tr key={e.indicator} className={table.tr}>
                    <th scope="row" className={`${table.td} text-left font-medium text-ink`}>{e.indicator}</th>
                    <td className={table.td}><Badge tone="neutral">{e.status}</Badge></td>
                    <td className={`${table.td} text-ink-muted`}>{e.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* Data quality + provenance */}
      <Section id="data" eyebrow="5 · Data" title="Every figure traces back to an official report">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader title="Reconciliation" action={<ShieldCheck className="size-4 text-risk-low" aria-hidden />} />
            <CardBody className="space-y-2 text-sm text-ink-muted">
              <p className="tabular text-3xl font-semibold text-navy-950">{evidence.data.reconciliation.passed} / {evidence.data.reconciliation.checks}</p>
              <p>checks pass: every overview total, ministry total, sector subtotal and project count extracted from the five PDFs matches the totals the reports themselves print.</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Data-quality flags" description="Flagged for verification, never altered" action={<FlaskConical className="size-4 text-ink-subtle" aria-hidden />} />
            <CardBody className="space-y-3 text-sm">
              <div className="flex gap-2">
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
            <CardHeader title="Reporting lag" action={<Database className="size-4 text-ink-subtle" aria-hidden />} />
            <CardBody className="space-y-2 text-sm text-ink-muted">
              <p className="tabular text-3xl font-semibold text-navy-950">{evidence.data.reporting_lag.median_lag_months.toFixed(1)} months</p>
              <p>median gap between a project&apos;s actual completion date and its appearance as “completed” in the Flash Report ({formatPct(evidence.data.reporting_lag.share_over_12_months * 100)} over a year). Some “ongoing” projects are already finished — PRISM raises a status-check alert for them.</p>
            </CardBody>
          </Card>
        </div>
        <Card>
          <CardHeader title="Source documents" description="PAIMANA monthly Flash Reports, fingerprinted with SHA-256" action={<EvidenceTag kind="OFFICIAL" />} />
          <ul className="divide-y divide-line">
            {evidence.data.sources.map((s) => (
              <li key={s.file} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-ink"><FileText className="size-4 text-ink-subtle" aria-hidden />{s.label}</span>
                <span className="font-mono text-xs text-ink-subtle" title={s.sha256}>sha256 {s.sha256.slice(0, 16)}…</span>
                <a href={s.origin} target="_blank" rel="noreferrer" className="text-xs font-medium text-prism-700 hover:underline">paimana-proj.mospi.gov.in/ReportPage</a>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section id="limits" eyebrow="6 · Limits" title="What this prototype does not claim">
        <Card>
          <CardBody>
            <ul className="grid gap-3 text-sm text-ink-muted md:grid-cols-2">
              {evidence.limits.map((l) => (
                <li key={l} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-saffron-500" aria-hidden />{l}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink-subtle">Scored {formatInt(evidence.scoring_time.projects)} projects in {evidence.scoring_time.seconds.toFixed(2)} s ({evidence.scoring_time.hardware}). Generated {evidence.generated_at.slice(0, 10)}.</p>
          </CardBody>
        </Card>
      </Section>
      <NextStep href="/ask/" question="Have a question about a project or the portfolio?" label="Ask PRISM — grounded answers with sources" />
    </div>
  );
}
