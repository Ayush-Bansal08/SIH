import { ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { LinkButton } from "@/components/ui/primitives";
import { EvidenceTag } from "@/components/ui/risk";
import { formatCr } from "@/lib/format";
import type { Scenario } from "@/lib/types";

/** Compact source → destination preview of the featured Advisor scenario. */
export function ScenarioTeaser({ s }: { s: Scenario }) {
  return (
    <div className="flex h-full flex-col">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        <div className="rounded-lg border border-risk-low-line bg-risk-low-bg/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-risk-low">Potential buffer</p>
          <p className="tabular mt-1 text-xl font-semibold text-navy-950">{formatCr(s.source.buffer_cr)}</p>
          <Link href={`/projects/${s.source.project_code}/`} className="mt-1 line-clamp-2 text-sm text-ink-muted hover:text-prism-700">
            {s.source.project_code} · {s.source.project_name}
          </Link>
        </div>
        <div className="flex items-center justify-center text-prism-600" aria-hidden>
          <ArrowRight className="size-6 rotate-90 sm:rotate-0" />
        </div>
        <div className="rounded-lg border border-risk-high-line bg-risk-high-bg/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-risk-high">Spent beyond sanction</p>
          <p className="tabular mt-1 text-xl font-semibold text-navy-950">{formatCr(s.destination.shortfall_cr)}</p>
          <Link href={`/projects/${s.destination.project_code}/`} className="mt-1 line-clamp-2 text-sm text-ink-muted hover:text-prism-700">
            {s.destination.project_code} · {s.destination.project_name}
          </Link>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-muted">
        Both in <strong className="text-ink">{s.destination.agency}</strong> ({s.ministry_short}). Scenario: up to{" "}
        <strong className="tabular text-ink">{formatCr(s.suggested_amount_cr)}</strong>, covering{" "}
        {Math.round(s.share_of_shortfall * 100)}% of the gap.
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-ev-illustrative">
          <Info className="size-3.5" aria-hidden />
          <EvidenceTag kind="ILLUSTRATIVE" /> subject to approval — no transfer is made
        </span>
        <LinkButton href="/advisor/" variant="accent" size="sm">
          Explore scenario <ArrowRight className="size-4" aria-hidden />
        </LinkButton>
      </div>
    </div>
  );
}
