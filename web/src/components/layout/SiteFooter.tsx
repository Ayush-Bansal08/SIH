import Link from "next/link";
import { EvidenceTag } from "@/components/ui/risk";
import { PrismMark } from "./Logo";

export function SiteFooter({ report, asOf, origin }: { report: string; asOf: string; origin: string }) {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <PrismMark className="size-7" />
            <span className="font-semibold text-navy-950">PAIMANA-PRISM</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            A prototype intelligence layer for PAIMANA project-monitoring data. Team Predictive Node, Smart India
            Hackathon 2026, problem statement SIH26103 (MoSPI).
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink">Data used</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Official figures from PAIMANA monthly Flash Reports #486–#490 (April–August 2026), latest: {report} ({asOf}),
            published at{" "}
            <a href={origin} className="text-prism-700 underline underline-offset-2 hover:text-prism-800" rel="noreferrer" target="_blank">
              paimana-proj.mospi.gov.in
            </a>
            . Scores and scenarios are precomputed by the PRISM prototype.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink">How to read the labels</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li className="flex items-center gap-2"><EvidenceTag kind="OFFICIAL" /> printed in a Flash Report</li>
            <li className="flex items-center gap-2"><EvidenceTag kind="DERIVED" /> calculated from official figures</li>
            <li className="flex items-center gap-2"><EvidenceTag kind="MODEL ESTIMATE" /> PRISM score, tested</li>
            <li className="flex items-center gap-2"><EvidenceTag kind="ILLUSTRATIVE" /> scenario, not an instruction</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-ink-subtle sm:px-6">
          <p>Prototype for demonstration. Not an official Government of India system. No fund transfers are performed.</p>
          <Link href="/design-system/" className="hover:text-prism-700">Design system</Link>
        </div>
      </div>
    </footer>
  );
}
