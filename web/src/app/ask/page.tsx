import type { Metadata } from "next";
import { Suspense } from "react";
import { AskPanel } from "@/components/ask/AskPanel";
import { PageHeader, Skeleton } from "@/components/ui/primitives";
import { AS_OF_LABEL, REPORT_LABEL } from "@/lib/data";

export const metadata: Metadata = { title: "Ask PRISM" };

export default function AskPage() {
  return (
    <div className="space-y-12 pb-8">
      <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={`Ask PRISM · ${REPORT_LABEL}, ${AS_OF_LABEL}`}
        title="Ask a question about the portfolio"
        description="Ask in plain words about risk, reasons, delays or budget options. Every answer comes from the prototype data and lists its sources."
      />
      </div>
      <Suspense fallback={<Skeleton className="mx-auto h-[30rem] max-w-3xl" />}>
        <AskPanel />
      </Suspense>
    </div>
  );
}
