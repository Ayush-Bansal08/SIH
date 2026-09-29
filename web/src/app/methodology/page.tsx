import { BookOpen, ExternalLink, FileText, Gauge, ListOrdered, ScanSearch, UserCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { table } from "@/components/ui/data";
import { Callout, Card, CardBody, PageHeader, SectionTitle } from "@/components/ui/primitives";
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
    <div className="space-y-24 pb-8 sm:space-y-32">
      <PageHeader
        eyebrow="Methodology"
        title="From PAIMANA data to decision support"
        description="PAIMANA tells you what happened. PRISM adds where to act next, why, and what options exist, using only the government's existing data and open-source tools."
      />

      <section aria-labelledby="stages-title">
        <SectionTitle id="stages-title" title="Six steps" text="From the official report to a decision. Each step links to where you can see it." />
        <ol className="mx-auto max-w-5xl space-y-5">
          {STAGES.map((s, i) => (
            <li key={s.title}>
              <Card as="article">
                <div className="px-6 py-7 sm:px-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                        <s.icon className="size-5" aria-hidden />
                      </span>
                      <div>
                        <p className="tabular text-xs font-semibold text-ink-subtle">Step {i + 1}</p>
                        <h3 className="text-lg font-semibold text-navy-950">{s.title}</h3>
                      </div>
                    </div>
                    <Link href={s.href} className="text-sm font-medium text-prism-700 hover:underline">See it →</Link>
                  </div>
                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <p className="text-[15px] leading-relaxed text-ink"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">What</span>{s.what}</p>
                    <p className="text-[15px] leading-relaxed text-ink-muted"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">How</span>{s.how}</p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="labels-title">
        <SectionTitle id="labels-title" title="How to read every number" text="Every figure on this site carries one of four labels." />
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardBody className="px-6 py-7 sm:px-8">
              <ul className="space-y-4 text-[15px] leading-relaxed text-ink-muted">
                <li className="flex items-start gap-3"><EvidenceTag kind="OFFICIAL" /> Printed in a PAIMANA Flash Report — shown exactly, with report number and page.</li>
                <li className="flex items-start gap-3"><EvidenceTag kind="DERIVED" /> Calculated only from official figures, e.g. delay = current − original completion date.</li>
                <li className="flex items-start gap-3"><EvidenceTag kind="MODEL ESTIMATE" /> PRISM&apos;s score — precomputed and tested on a month it never saw.</li>
                <li className="flex items-start gap-3"><EvidenceTag kind="ILLUSTRATIVE" /> A decision-support scenario — never an instruction or a fund transfer.</li>
              </ul>
            </CardBody>
          </Card>
          <Callout tone="illustrative" title="Prototype disclaimer">
            This is a prototype for Smart India Hackathon 2026 (PS SIH26103, MoSPI), not an official Government of India system. Official figures come from public PAIMANA Flash Reports; scores and scenarios are PRISM&apos;s own analysis. {advisor.caveat}
          </Callout>
        </div>
      </section>

      <section aria-labelledby="research-title">
        <SectionTitle
          id="research-title"
          title="Built on established methods"
          text="Research shows the techniques are sound; PRISM applies them to PAIMANA's own data. None of these studies used PAIMANA itself."
        />
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {RESEARCH.map((r) => (
            <Card key={r.id} as="article">
              <CardBody className="flex h-full flex-col px-6 py-6">
                <BookOpen className="size-4 text-prism-600" aria-hidden />
                <p className="mt-3 text-[15px] leading-relaxed text-ink">{r.text}</p>
                <p className="mt-3 text-xs text-ink-subtle">{r.cite}</p>
                <a href={r.href} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-medium text-prism-700 hover:underline">
                  Source <ExternalLink className="size-3" aria-hidden />
                </a>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="prod-title">
        <SectionTitle id="prod-title" title="Prototype today, production next" text="What is live in this prototype, and what the full system adds." />
        <Card className="mx-auto max-w-5xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className={table.table}>
              <caption className="sr-only">Prototype versus production</caption>
              <thead className={table.thead}>
                <tr>
                  <th scope="col" className={`${table.th} px-6`}>Area</th>
                  <th scope="col" className={table.th}>In this prototype</th>
                  <th scope="col" className={`${table.th} px-6`}>Production path</th>
                </tr>
              </thead>
              <tbody>
                {PROTO_VS_PROD.map(([area, now, next]) => (
                  <tr key={area} className={table.tr}>
                    <th scope="row" className={`${table.td} px-6 py-4 text-left font-semibold text-navy-950`}>{area}</th>
                    <td className={`${table.td} py-4 text-ink`}>{now}</td>
                    <td className={`${table.td} px-6 py-4 text-ink-muted`}>{next}</td>
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
