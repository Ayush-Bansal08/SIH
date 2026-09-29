"use client";

import clsx from "clsx";
import { ArrowDown, ArrowRight, Check, ClipboardCopy, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { SplitShell, railShell } from "@/components/layout/Split";
import { Card, CardBody } from "@/components/ui/primitives";
import { RiskBadge } from "@/components/ui/risk";
import { formatCr } from "@/lib/format";
import type { Scenario } from "@/lib/types";
import { AllocationBar, Legend } from "./AllocationBar";

const C = {
  buffer: "#17b26a",
  moved: "#e8871e",
  spent: "#8a8a85",
  over: "#b42318",
};

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

function brief(s: Scenario, amount: number, caveat: string) {
  const same = s.match_level === "same agency";
  return [
    `PRISM decision-support note — scenario ${s.id} (${s.ministry})`,
    "",
    `Potential source: ${s.source.project_code} ${s.source.project_name} (${s.source.agency}) — running ${formatCr(s.source.buffer_cr)} below its original approved cost after an official downward revision.`,
    `Potential destination: ${s.destination.project_code} ${s.destination.project_name} (${s.destination.agency}) — cumulative expenditure ${formatCr(s.destination.shortfall_cr)} above its sanctioned cost.`,
    `Match: ${same ? "same implementing agency" : "same ministry"}.`,
    "",
    `Scenario explored: ${formatCr(amount)} — covers ${Math.round((amount / s.destination.shortfall_cr) * 100)}% of the shortfall; ${formatCr(s.source.buffer_cr - amount)} of the buffer would remain.`,
    "",
    `Figures: PAIMANA Flash Report #490 (Aug 2026), pages ${s.source.source_page} and ${s.destination.source_page}; buffer and shortfall derived from official figures.`,
    caveat,
  ].join("\n");
}

/** Left-aligned heading for one part of the Advisor (the scenario list sits on the left). */
export function PartTitle({ id, title, text }: { id: string; title: ReactNode; text?: ReactNode }) {
  return (
    <div className="mb-5">
      <h2 id={id} className="text-2xl font-normal tracking-[-0.02em] text-ink">{title}</h2>
      {text && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{text}</p>}
    </div>
  );
}

export function AdvisorWorkspace({ scenarios, caveat, top, children }: { scenarios: Scenario[]; caveat: string; top?: ReactNode; children?: ReactNode }) {
  const router = useRouter();
  // Deep link (?scenario=R002) is applied after load, so the page itself is fully pre-rendered.
  const [id, setId] = useState(scenarios[0].id);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("scenario");
    if (requested && scenarios.some((x) => x.id === requested)) setId(requested);
  }, [scenarios]);
  const s = scenarios.find((x) => x.id === id) ?? scenarios[0];
  const max = round2(Math.min(s.source.buffer_cr, s.destination.shortfall_cr));
  const [amount, setAmount] = useState(s.suggested_amount_cr);
  const [copied, setCopied] = useState(false);
  const sliderId = useId();

  useEffect(() => {
    setAmount(s.suggested_amount_cr);
    setCopied(false);
  }, [s]);

  const select = (next: string) => {
    setId(next);
    router.replace(`/advisor/?scenario=${next}`, { scroll: false });
  };

  const a = Math.min(Math.max(0, amount), max);
  const src = s.source;
  const dst = s.destination;
  const bufferLeft = round2(src.buffer_cr - a);
  const gapLeft = round2(dst.shortfall_cr - a);
  const covered = dst.shortfall_cr > 0 ? a / dst.shortfall_cr : 0;
  const gapScale = Math.max(src.buffer_cr, dst.shortfall_cr) * 1.02;
  const text = useMemo(() => brief(s, a, caveat), [s, a, caveat]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const rail = (
    <nav aria-label="Scenarios" className={railShell}>
      <div className="border-b border-line p-5">
        <h2 className="text-lg font-normal tracking-[-0.01em] text-ink">
          Scenarios <span className="text-sm text-ink-subtle">({scenarios.length})</span>
        </h2>
        <p className="mt-1 text-sm text-ink-subtle">Pick one to explore it on the right.</p>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {scenarios.map((x, i) => {
          const on = x.id === s.id;
          return (
            <li key={x.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => select(x.id)}
                className={clsx("w-full rounded-xl px-4 py-3.5 text-left transition-colors", on ? "bg-ink text-white" : "hover:bg-canvas")}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={clsx("text-[11px] font-medium uppercase tracking-[0.14em]", on ? "text-white/70" : "text-ink-subtle")}>
                    {i === 0 ? "Featured" : `Scenario ${i + 1}`}
                  </span>
                  <span className={clsx("tabular text-sm font-semibold", on ? "text-white" : "text-ink")}>{formatCr(x.suggested_amount_cr)}</span>
                </span>
                <span className={clsx("mt-1 block truncate text-sm font-medium", on ? "text-white" : "text-ink")}>{x.destination.project_name}</span>
                <span className={clsx("mt-0.5 block text-xs", on ? "text-white/70" : "text-ink-subtle")}>
                  {x.source.project_code} → {x.destination.project_code} · {x.ministry_short}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <SplitShell rail={rail}>
      <div className="space-y-16">
        {top}

        {/* 1. The scenario */}
        <section aria-labelledby="flow-title">
          <PartTitle
            id="flow-title"
            title="Explore a scenario"
            text={<>{s.ministry}, {s.match_level}. Pick another scenario on the left, or move the slider to see how much of the gap the spare money covers.</>}
          />
          <div className="grid gap-5 lg:grid-cols-[1fr_minmax(16rem,20rem)_1fr] lg:items-stretch">
            {/* Source */}
            <div className="flex flex-col rounded-2xl border border-risk-low-line bg-risk-low-bg/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-risk-low">Has spare budget</p>
              <Link href={`/projects/${src.project_code}/`} className="mt-2 line-clamp-2 font-semibold text-navy-950 hover:text-prism-700">
                {src.project_name}
              </Link>
              <p className="mt-1 text-xs text-ink-subtle">{src.project_code} · {src.state_label}</p>
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-ink-subtle">Original cost</dt><dd className="tabular font-medium text-ink">{formatCr(src.original_cost_cr)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-subtle">Revised cost</dt><dd className="tabular font-medium text-ink">{formatCr(src.sanctioned_cr)}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-ink-subtle">Delay risk</dt><dd><RiskBadge band={src.risk_band} withTooltip={false} /></dd></div>
              </dl>
              <div className="mt-auto pt-5">
                <p className="text-xs text-ink-subtle">Spare budget (official downward revision)</p>
                <p className="tabular text-2xl font-semibold text-risk-low">{formatCr(src.buffer_cr)}</p>
              </div>
            </div>

            {/* Amount */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-navy-950 px-6 py-7 text-center text-white">
              <label htmlFor={sliderId} className="text-xs font-semibold uppercase tracking-wide text-navy-100">
                Scenario amount
              </label>
              <p className="tabular mt-2 text-3xl font-semibold" aria-live="polite">{formatCr(a)}</p>
              <p className="mt-1 text-sm text-navy-100">covers {Math.round(covered * 100)}% of the shortfall</p>
              <input
                id={sliderId}
                type="range"
                min={0}
                max={max}
                step={0.01}
                value={a}
                onChange={(e) => setAmount(Number(e.target.value))}
                aria-valuetext={formatCr(a)}
                className="mt-6 w-full cursor-pointer accent-saffron-500"
              />
              <div className="mt-1 flex w-full justify-between text-xs text-navy-100">
                <span>₹0</span>
                <span>{formatCr(max)}</span>
              </div>
              <button
                type="button"
                onClick={() => setAmount(s.suggested_amount_cr)}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-saffron-500 px-4 py-1.5 text-sm font-semibold text-navy-950 hover:bg-saffron-100"
              >
                <RotateCcw className="size-3.5" aria-hidden /> Suggested
              </button>
              <ArrowDown className="mt-4 size-5 text-saffron-500 lg:hidden" aria-hidden />
            </div>

            {/* Destination */}
            <div className="flex flex-col rounded-2xl border border-risk-high-line bg-risk-high-bg/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-risk-high">Has spent beyond its budget</p>
              <Link href={`/projects/${dst.project_code}/`} className="mt-2 line-clamp-2 font-semibold text-navy-950 hover:text-prism-700">
                {dst.project_name}
              </Link>
              <p className="mt-1 text-xs text-ink-subtle">{dst.project_code} · {dst.state_label}</p>
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-ink-subtle">Sanctioned cost</dt><dd className="tabular font-medium text-ink">{formatCr(dst.sanctioned_cr)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-subtle">Spent so far</dt><dd className="tabular font-medium text-ink">{formatCr(dst.expenditure_cr)}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-ink-subtle">Delay risk</dt><dd><RiskBadge band={dst.risk_band} withTooltip={false} /></dd></div>
              </dl>
              <div className="mt-auto pt-5">
                <p className="text-xs text-ink-subtle">Shortfall (spent beyond sanction)</p>
                <p className="tabular text-2xl font-semibold text-risk-high">{formatCr(dst.shortfall_cr)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Before / after — one shared scale so the moved amount has the same width on both sides */}
        <section aria-labelledby="before-after-title">
          <PartTitle id="before-after-title" title="Before and after" text="Both sides use the same ₹ scale: the orange amount leaves the spare budget and closes the shortfall." />
          <Card>
            <CardBody className="grid gap-10 px-6 py-7 lg:grid-cols-2">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-navy-950">
                  {src.project_code} <span className="font-normal text-ink-muted">· spare budget</span>
                </p>
                <AllocationBar caption={`Before · ${formatCr(src.buffer_cr)} spare`} scale={gapScale} segments={[{ value: src.buffer_cr, color: C.buffer, label: "Buffer" }]} />
                <AllocationBar
                  caption={`After · ${formatCr(bufferLeft)} spare remaining`}
                  scale={gapScale}
                  segments={[
                    { value: a, color: C.moved, label: "Scenario amount" },
                    { value: bufferLeft, color: C.buffer, label: "Buffer remaining" },
                  ]}
                />
                <Legend items={[{ color: C.moved, label: "Scenario amount" }, { color: C.buffer, label: "Spare remaining" }]} />
              </div>
              <div className="space-y-4">
                <p className="text-sm font-semibold text-navy-950">
                  {dst.project_code} <span className="font-normal text-ink-muted">· shortfall</span>
                </p>
                <AllocationBar caption={`Before · shortfall ${formatCr(dst.shortfall_cr)}`} scale={gapScale} segments={[{ value: dst.shortfall_cr, color: C.over, label: "Shortfall", pattern: "hatch" }]} />
                <AllocationBar
                  caption={`After · ${formatCr(gapLeft)} shortfall remaining`}
                  scale={gapScale}
                  segments={[
                    { value: a, color: C.moved, label: "Covered by scenario" },
                    { value: gapLeft, color: C.over, label: "Shortfall remaining", pattern: "hatch" },
                  ]}
                />
                <Legend items={[{ color: C.moved, label: "Covered by scenario" }, { color: C.over, label: "Shortfall remaining", pattern: "hatch" }]} />
              </div>
            </CardBody>
          </Card>
        </section>

        {/* 3. Impact */}
        <section aria-labelledby="impact-title">
          <PartTitle id="impact-title" title="What this would change" text="An illustrative result, not an instruction." />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Impact label="Shortfall covered" value={`${Math.round(covered * 100)}%`} sub={`${formatCr(a)} of ${formatCr(dst.shortfall_cr)}`} tone={covered >= 0.999 ? "good" : "neutral"} />
            <Impact label="Shortfall remaining" value={formatCr(gapLeft)} sub={gapLeft > 0.005 ? "needs another source or a revised sanction" : "fully covered in this scenario"} tone={gapLeft > 0.005 ? "warn" : "good"} />
            <Impact label="Spare budget left" value={formatCr(bufferLeft)} sub="the source stays within its original approval" tone="neutral" />
            <Impact label="Delay-risk score" value="Unchanged" sub="money alone does not move a completion date" tone="neutral" />
          </div>
        </section>

        {/* 4. Advisory note */}
        <section aria-labelledby="note-title">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="note-title" className="text-2xl font-normal tracking-[-0.02em] text-ink">Advisory note</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">Written from the figures above, ready to share for review.</p>
            </div>
            <button type="button" onClick={copy} className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-ink ring-1 ring-inset ring-line-strong hover:bg-canvas">
              {copied ? <Check className="size-4 text-risk-low" aria-hidden /> : <ClipboardCopy className="size-4" aria-hidden />}
              {copied ? "Copied" : "Copy note"}
            </button>
          </div>
          <Card className="border-prism-100 ring-1 ring-prism-100">
            <CardBody className="space-y-7 px-6 py-7">
              <p className="text-base leading-relaxed text-ink">
                In <strong>{s.ministry}</strong>, project <strong>{src.project_code}</strong> is running{" "}
                <strong className="tabular">{formatCr(src.buffer_cr)}</strong> below its original approved cost after an official downward revision, while project{" "}
                <strong>{dst.project_code}</strong> in {s.match_level === "same agency" ? <>the same agency ({dst.agency})</> : <>{dst.agency}, under the same ministry</>} has already spent{" "}
                <strong className="tabular">{formatCr(dst.shortfall_cr)}</strong> beyond its sanctioned cost. PRISM suggests evaluating a reallocation of{" "}
                <strong className="tabular text-prism-700">{formatCr(a)}</strong>, subject to standard government re-appropriation approval.
              </p>
              <div className="border-t border-line pt-6">
                <p className="text-sm font-semibold text-navy-950">
                  Typical next steps <span className="font-normal text-ink-subtle">(the exact route depends on the ministry&apos;s rules)</span>
                </p>
                <ol className="mt-3 space-y-2.5 text-[15px] text-ink-muted">
                  {[
                    `Confirm the latest expenditure and revised-cost figures with ${dst.agency}.`,
                    `Confirm that the savings in ${src.project_code} are not already committed.`,
                    "Prepare a re-appropriation / revised-cost proposal through the ministry's finance wing.",
                    "Decision by the competent authority under the applicable delegation of financial powers.",
                  ].map((t, i) => (
                    <li key={t} className="flex gap-3">
                      <span className="tabular mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">{i + 1}</span>
                      {t}
                    </li>
                  ))}
                </ol>
              </div>
              <p className="border-t border-line pt-5 text-xs leading-relaxed text-ink-subtle">
                Figures: Flash Report #490 (Aug 2026), pages {src.source_page} and {dst.source_page}. Spare budget = original − revised cost; shortfall = spent − sanctioned
                cost. Illustrative only: no money is moved.{" "}
                <Link href={`/projects/${dst.project_code}/`} className="inline-flex items-center gap-1 font-medium text-prism-700 hover:underline">
                  Destination risk profile <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </p>
            </CardBody>
          </Card>
        </section>

        {children}
      </div>
    </SplitShell>
  );
}

function Impact({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "good" | "warn" | "neutral" }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border bg-surface p-5 shadow-[var(--shadow-card)]",
        tone === "good" ? "border-risk-low-line" : tone === "warn" ? "border-risk-moderate-line" : "border-line",
      )}
    >
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className={clsx("tabular mt-1.5 text-2xl font-semibold transition-colors", tone === "good" ? "text-risk-low" : tone === "warn" ? "text-risk-moderate" : "text-navy-950")}>{value}</p>
      <p className="mt-1 text-xs text-ink-subtle">{sub}</p>
    </div>
  );
}
