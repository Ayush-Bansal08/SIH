import { BookOpen, ExternalLink, FileText, Gauge, ListOrdered, ScanSearch, UserCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { table } from "@/components/ui/data";
import { Callout, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/primitives";
import { EvidenceTag } from "@/components/ui/risk";
import { advisor, evidence, portfolio } from "@/lib/data";
import { formatInt, formatMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Methodology" };

const t = evidence.test;
const w = evidence.fusion_weights;

const STAGES = [
  {
    icon: FileText,
    title: "Data",
    href: "/evidence/#data",
    what: `Official PAIMANA monthly Flash Reports #486–#490 (${formatMonth(evidence.protocol.train_months[0])}–${formatMonth(evidence.protocol.scored_month)}): ${formatInt(portfolio.official.ongoing_projects)} ongoing projects in the latest report.`,
    how: `Every table is extracted from the PDFs and reconciled against the reports' own printed totals (${evidence.data.reconciliation.passed}/${evidence.data.reconciliation.checks} checks pass). Implausible values are flagged, never changed. Nothing new is asked of any official.`,
  },
  {
    icon: Gauge,
    title: "Risk detection",
    href: "/command-center/",
    what: "A 0–10 early-warning score per project: 10 × the chance that its official completion date is pushed back in the next monthly report.",
    how: `Two statistical models (logistic regression; a Cox proportional-hazards model of repeated delays) and one machine-learning model (XGBoost) are trained only on earlier reports, calibrated on a held-out month and combined by accuracy (weights ${Math.round(w.logit * 100)} / ${Math.round(w.cox * 100)} / ${Math.round(w.xgb * 100)}%). Random forest is run as a comparator.`,
  },
  {
    icon: ScanSearch,
    title: "Explanation",
    href: "/projects/",
    what: "The top three reasons behind every score, in plain language that quotes the project's own figures.",
    how: "Each score splits exactly into factor contributions (TreeSHAP for XGBoost, linear terms for the statistical models). A reason is shown only when it genuinely moves the score and its sentence supports its direction. Rule-based indicators from the official figures sit alongside, independent of the model.",
  },
  {
    icon: ListOrdered,
    title: "Prioritisation",
    href: "/command-center/",
    what: "Bands — High ≥ 40%, Elevated 20–40%, Moderate 8–20%, Low < 8% — and a ranked priority list.",
    how: `Bands are calibrated probabilities, checked on the test month: ${t.high_correct} of ${t.high_flagged} High-band projects were actually revised in the next report.`,
  },
  {
    icon: Wallet,
    title: "Prescriptive options",
    href: "/advisor/",
    what: "Same-ministry budget scenarios: where an officially revised-down project could help one that has spent beyond its sanction.",
    how: `Buffers = original − revised cost; shortfalls = expenditure − sanctioned cost; pairs only inside a ministry, same agency first; ${advisor.excluded_for_verification.length} projects with suspect figures are held back. Scenarios are illustrative and subject to approval.`,
  },
  {
    icon: UserCheck,
    title: "Decision support",
    href: "/ask/",
    what: "Officials decide. PRISM supplies a ranked, explained, sourced shortlist and a shareable advisory note.",
    how: "Every number is labelled Official, Derived, Model estimate or Illustrative. Ask PRISM answers only from the same data, with sources — it cannot invent a figure.",
  },
];

const RESEARCH = [
  {
    id: "A3",
    text: "In 258 transport projects across 20 nations, costs were underestimated in almost 9 of 10, by 28% on average — with no improvement in 70 years.",
    cite: "Flyvbjerg, Holm & Buhl (2002), Journal of the American Planning Association 68(3)",
    href: "https://arxiv.org/abs/1303.6604",
  },
  {
    id: "A5",
    text: "A study of 30 Indian mega projects using MoSPI's project-monitoring reports found road projects had the largest overruns, driven by land acquisition, clearances and price escalation.",
    cite: "Journal of The Institution of Engineers (India): Series A 100 (2019)",
    href: "https://link.springer.com/article/10.1007/s40030-018-0328-1",
  },
  {
    id: "A1",
    text: "On 836 public construction projects, XGBoost predicted cost overrun with R² = 0.844.",
    cite: "Hamdan, Thneibat & Hyari (2025), Engineering, Construction and Architectural Management",
    href: "https://doi.org/10.1108/ECAM-09-2024-1209",
  },
  {
    id: "A2",
    text: "Cox proportional-hazards models are an established, peer-reviewed method for infrastructure cost risk.",
    cite: "Li & Ashuri (2021), Journal of Construction Engineering and Management 147(10)",
    href: "https://ascelibrary.org/doi/10.1061/%28ASCE%29CO.1943-7862.0002164",
  },
  {
    id: "A4",
    text: "SHAP is the standard, game-theory-based method for explaining model predictions (42,000+ citations).",
    cite: "Lundberg & Lee (2017), NeurIPS 30",
    href: "https://papers.nips.cc/paper/7062-a-unified-approach-to-interpreting-model-predictions",
  },
];

const PROTO_VS_PROD = [
  ["Data", "Five public monthly Flash Reports (PDF), extracted and reconciled", "PAIMANA CUF feed (monthly) + the OCMS historical archive"],
  ["Models", "Trained offline once; scores precomputed into the prototype", "Retrained each month on the full history, with monitoring of accuracy"],
  ["Budget outlook", "Official figures: downward revisions and spending above sanction", "Adds a likely final-cost range per project from completed-project histories"],
  ["Ask PRISM", "Fixed, grounded answers matched to the question", "A locally hosted, retrieval-grounded model on government premises"],
  ["CUF-Gap", "Descriptive comparison of signals parsed from project names", "Measured accuracy gain from new CUF fields and external data (prices, rainfall)"],
  ["Platform", "Static web app; no login, no database", "Secure deployment with role-based access, integrated with PAIMANA"],
];

export default function MethodologyPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Methodology"
        title="From PAIMANA data to decision support"
        description="PAIMANA tells you what happened. PRISM adds where to act next, why, and what options exist — using only the government's existing data and open-source tools."
      />

      <section aria-labelledby="stages-title" className="space-y-4">
        <h2 id="stages-title" className="text-xl font-semibold text-navy-950">Six steps</h2>
        <ol className="space-y-3">
          {STAGES.map((s, i) => (
            <li key={s.title}>
              <Card as="article">
                <div className="grid gap-4 p-5 md:grid-cols-[14rem_1fr_1fr]">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-800">
                      <s.icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="tabular text-xs font-semibold text-ink-subtle">Step {i + 1}</p>
                      <h3 className="font-semibold text-navy-950">{s.title}</h3>
                      <Link href={s.href} className="text-xs font-medium text-prism-700 hover:underline">See it →</Link>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-ink"><span className="block text-xs font-semibold uppercase tracking-wide text-ink-subtle">What</span>{s.what}</p>
                  <p className="text-sm leading-relaxed text-ink-muted"><span className="block text-xs font-semibold uppercase tracking-wide text-ink-subtle">How</span>{s.how}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="labels-title" className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="How to read every number" />
          <CardBody>
            <ul className="space-y-3 text-sm text-ink-muted">
              <li className="flex items-start gap-3"><EvidenceTag kind="OFFICIAL" /> Printed in a PAIMANA Flash Report — shown exactly, with report number and page.</li>
              <li className="flex items-start gap-3"><EvidenceTag kind="DERIVED" /> Calculated only from official figures, e.g. delay = current − original completion date.</li>
              <li className="flex items-start gap-3"><EvidenceTag kind="MODEL ESTIMATE" /> PRISM&apos;s score — precomputed and tested on a month it never saw.</li>
              <li className="flex items-start gap-3"><EvidenceTag kind="ILLUSTRATIVE" /> A decision-support scenario — never an instruction or a fund transfer.</li>
            </ul>
          </CardBody>
        </Card>
        <Callout tone="illustrative" className="self-start" title="Prototype disclaimer">
          This is a prototype for Smart India Hackathon 2026 (PS SIH26103, MoSPI), not an official Government of India system. Official figures come from public PAIMANA Flash Reports; scores and scenarios are PRISM&apos;s own analysis. {advisor.caveat}
        </Callout>
      </section>

      <section aria-labelledby="research-title" className="space-y-4">
        <div>
          <h2 id="research-title" className="text-xl font-semibold text-navy-950">Built on established methods</h2>
          <p className="text-sm text-ink-muted">Research shows the techniques are sound; PRISM applies them to PAIMANA&apos;s own data. None of these studies used PAIMANA itself.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {RESEARCH.map((r) => (
            <Card key={r.id} as="article">
              <CardBody className="flex h-full flex-col">
                <BookOpen className="size-4 text-prism-600" aria-hidden />
                <p className="mt-2 text-sm leading-relaxed text-ink">{r.text}</p>
                <p className="mt-3 text-xs text-ink-subtle">{r.cite}</p>
                <a href={r.href} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-prism-700 hover:underline">
                  Source <ExternalLink className="size-3" aria-hidden />
                </a>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="prod-title">
        <Card>
          <CardHeader title="Prototype today → production path" description="What is live in this prototype, and what the full system adds" />
          <div className="overflow-x-auto">
            <table className={table.table}>
              <caption className="sr-only">Prototype versus production</caption>
              <thead className={table.thead}>
                <tr>
                  <th scope="col" className={table.th}>Area</th>
                  <th scope="col" className={table.th}>In this prototype</th>
                  <th scope="col" className={table.th}>Production path</th>
                </tr>
              </thead>
              <tbody>
                {PROTO_VS_PROD.map(([area, now, next]) => (
                  <tr key={area} className={table.tr}>
                    <th scope="row" className={`${table.td} text-left font-semibold text-navy-950`}>{area}</th>
                    <td className={`${table.td} text-ink`}>{now}</td>
                    <td className={`${table.td} text-ink-muted`}>{next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
