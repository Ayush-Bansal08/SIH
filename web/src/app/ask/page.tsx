import type { Metadata } from "next";
import { Suspense } from "react";
import { AskPanel } from "@/components/ask/AskPanel";
import { PageHeader, Skeleton } from "@/components/ui/primitives";
import { AS_OF_LABEL, REPORT_LABEL } from "@/lib/data";

export const metadata: Metadata = { title: "Ask PRISM" };

export default function AskPage() {
  return (
    <div className="space-y-2">
      <PageHeader
        eyebrow={`Ask PRISM · ${REPORT_LABEL}, ${AS_OF_LABEL}`}
        title="Ask a question about the portfolio"
        description="Plain-language answers about risk, reasons, schedule slippage, budget pressure and budget options — each with its sources."
      />
      <Suspense fallback={<Skeleton className="h-[32rem]" />}>
        <AskPanel />
      </Suspense>
    </div>
  );
}
