"use client";

import clsx from "clsx";
import { ArrowDown, ArrowRight, Check, ClipboardCopy, Info, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { SplitShell, railShell } from "@/components/layout/Split";
import { BAND_META } from "@/lib/labels";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui/primitives";
import { EvidenceTag, RiskBadge } from "@/components/ui/risk";
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
      <div className="border-b border-line p-4">
        <h2 className="text-lg font-normal tracking-[-0.01em] text-ink">
          Scenarios <span className="text-sm text-ink-subtle">({scenarios.length})</span>
        </h2>
        <p className="mt-1 text-xs text-ink-subtle">Found in the latest report · same ministry, same agency first</p>
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
                className={clsx("w-full rounded-xl px-3 py-3 text-left transition-colors", on ? "bg-ink text-white" : "hover:bg-canvas")}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={clsx("text-[11px] font-medium uppercase tracking-[0.14em]", on ? "text-white/70" : "text-ink-subtle")}>
                    {i === 0 ? "Featured" : `Scenario ${i + 1}`} · {x.match_level}
                  </span>
                  <span className={clsx("tabular text-sm font-semibold", on ? "text-white" : "text-ink")}>{formatCr(x.suggested_amount_cr)}</span>
                </span>
                <span className={clsx("mt-1 block text-sm", on ? "text-white" : "text-ink")}>
                  {x.ministry_short} · {x.source.project_code} → {x.destination.project_code}
                </span>
                <span className={clsx("mt-1 block truncate text-xs", on ? "text-white/70" : "text-ink-subtle")}>{x.destination.project_name}</span>
                <span className={clsx("mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide", on && "text-white/80")}>
                  Destination risk {on ? BAND_META[x.destination.risk_band].label : <RiskBadge band={x.destination.risk_band} withTooltip={false} />}
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
    <div className="space-y-6">
      {top}
      {/* Flow */}
      <Card>
        <CardHeader
          eyebrow={`${s.ministry} · ${s.match_level}`}
          title="Potential source → amount → potential destination"
          action={<EvidenceTag kind="ILLUSTRATIVE" detail="Buffer and shortfall are derived from official Flash Report figures." />}
        />
        <CardBody>
          <div className="grid gap-5 lg:grid-cols-[1fr_minmax(17rem,22rem)_1fr] lg:items-stretch">
            {/* Source */}
            <div className="flex flex-col rounded-2xl border border-risk-low-line bg-risk-low-bg/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-risk-low">Potential source · buffer</p>
              <Link href={`/projects/${src.project_code}/`} className="mt-1.5 line-clamp-2 font-semibold text-navy-950 hover:text-prism-700">
                {src.project_name}
              </Link>
              <p className="mt-0.5 text-xs text-ink-subtle">{src.project_code} · {src.agency} · {src.state_label}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-ink-subtle">Original approved cost</dt><dd className="tabular font-medium text-ink">{formatCr(src.original_cost_cr)}</dd></div>
                <div><dt className="text-xs text-ink-subtle">Revised cost</dt><dd className="tabular font-medium text-ink">{formatCr(src.sanctioned_cr)}</dd></div>
                <div><dt className="text-xs text-ink-subtle">Physical progress</dt><dd className="tabular font-medium text-ink">{src.physical_progress_pct.toFixed(0)}%</dd></div>
                <div><dt className="text-xs text-ink-subtle">Delay risk</dt><dd className="flex items-center gap-1.5"><span className="tabular font-medium text-ink">{src.risk_score.toFixed(1)}</span><RiskBadge band={src.risk_band} withTooltip={false} /></dd></div>
              </dl>
              <div className="mt-auto pt-4">
                <p className="text-xs text-ink-subtle">Buffer (official downward revision)</p>
                <p className="tabular text-2xl font-semibold text-risk-low">{formatCr(src.buffer_cr)}</p>
              </div>
            </div>

            {/* Amount */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-navy-950 px-5 py-6 text-center text-white">
              <label htmlFor={sliderId} className="text-xs font-semibold uppercase tracking-wide text-navy-100">
                Scenario amount
              </label>
              <p className="tabular mt-2 text-3xl font-semibold" aria-live="polite">{formatCr(a)}</p>
              <p className="mt-1 text-xs text-navy-100">covers {Math.round(covered * 100)}% of the shortfall</p>
              <input
                id={sliderId}
                type="range"
                min={0}
                max={max}
                step={0.01}
                value={a}
                onChange={(e) => setAmount(Number(e.target.value))}
                aria-valuetext={formatCr(a)}
                className="mt-5 w-full cursor-pointer accent-saffron-500"
              />
              <div className="mt-1 flex w-full justify-between text-[11px] text-navy-100">
                <span>₹0</span>
                <span>{formatCr(max)}</span>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {[0.25, 0.5, 0.75].map((f) => (
                  <button key={f} type="button" onClick={() => setAmount(round2(max * f))} className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-white/20 hover:bg-white/20">
                    {f * 100}%
                  </button>
                ))}
                <button type="button" onClick={() => setAmount(s.suggested_amount_cr)} className="inline-flex items-center gap-1 rounded-md bg-saffron-500 px-2.5 py-1 text-xs font-semibold text-navy-950 hover:bg-saffron-100">
                  <RotateCcw className="size-3" aria-hidden /> Suggested
                </button>
              </div>
              <label className="mt-4 flex items-center gap-2 text-xs text-navy-100">
                Exact ₹ Cr
                <input
                  type="number"
                  min={0}
                  max={max}
                  step={0.01}
                  value={a}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="tabular h-8 w-28 rounded-md border border-white/20 bg-white/10 px-2 text-right text-sm text-white focus:outline-none focus:ring-2 focus:ring-saffron-500"
                />
              </label>
              <div className="prism-flow mt-5 hidden h-3 w-full lg:block" aria-hidden />
              <ArrowDown className="mt-3 size-5 text-saffron-500 lg:hidden" aria-hidden />
            </div>

            {/* Destination */}
            <div className="flex flex-col rounded-2xl border border-risk-high-line bg-risk-high-bg/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-risk-high">Potential destination · shortfall</p>
              <Link href={`/projects/${dst.project_code}/`} className="mt-1.5 line-clamp-2 font-semibold text-navy-950 hover:text-prism-700">
                {dst.project_name}
              </Link>
              <p className="mt-0.5 text-xs text-ink-subtle">{dst.project_code} · {dst.agency} · {dst.state_label}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-ink-subtle">Sanctioned cost</dt><dd className="tabular font-medium text-ink">{formatCr(dst.sanctioned_cr)}</dd></div>
                <div><dt className="text-xs text-ink-subtle">Cumulative expenditure</dt><dd className="tabular font-medium text-ink">{formatCr(dst.expenditure_cr)}</dd></div>
                <div><dt className="text-xs text-ink-subtle">Physical progress</dt><dd className="tabular font-medium text-ink">{dst.physical_progress_pct.toFixed(0)}%</dd></div>
                <div><dt className="text-xs text-ink-subtle">Delay risk</dt><dd className="flex items-center gap-1.5"><span className="tabular font-medium text-ink">{dst.risk_score.toFixed(1)}</span><RiskBadge band={dst.risk_band} withTooltip={false} /></dd></div>
              </dl>
              <div className="mt-auto pt-4">
                <p className="text-xs text-ink-subtle">Shortfall (spent beyond sanction)</p>
                <p className="tabular text-2xl font-semibold text-risk-high">{formatCr(dst.shortfall_cr)}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Before / after — one shared scale so the moved amount has the same width on both sides */}
      <Card>
        <CardHeader
          title="Before and after"
          description="Both sides use the same ₹ scale: the saffron amount leaves the buffer and closes the shortfall."
          action={<EvidenceTag kind="ILLUSTRATIVE" />}
        />
        <CardBody className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-navy-950">
              Source {src.project_code} <span className="font-normal text-ink-muted">· buffer below original approval</span>
            </p>
            <AllocationBar caption={`Before · buffer ${formatCr(src.buffer_cr)}`} scale={gapScale} segments={[{ value: src.buffer_cr, color: C.buffer, label: "Buffer" }]} />
            <AllocationBar
              caption={`After · ${formatCr(bufferLeft)} buffer remaining`}
              scale={gapScale}
              segments={[
                { value: a, color: C.moved, label: "Scenario amount" },
                { value: bufferLeft, color: C.buffer, label: "Buffer remaining" },
              ]}
            />
            <Legend items={[{ color: C.moved, label: "Scenario amount" }, { color: C.buffer, label: "Buffer remaining" }]} />
            <p className="text-xs text-ink-subtle">Revised cost {formatCr(src.sanctioned_cr)} of an original {formatCr(src.original_cost_cr)} — unchanged by the scenario.</p>
          </div>
          <div className="space-y-4">
            <p className="text-sm font-semibold text-navy-950">
              Destination {dst.project_code} <span className="font-normal text-ink-muted">· spent beyond sanction</span>
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
            <p className="text-xs text-ink-subtle">Expenditure {formatCr(dst.expenditure_cr)} against a sanctioned {formatCr(dst.sanctioned_cr)}.</p>
          </div>
        </CardBody>
      </Card>

      {/* Impact */}
      <section aria-labelledby="impact-title">
        <h2 id="impact-title" className="mb-3 text-lg font-semibold text-navy-950">Illustrative impact</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Impact label="Shortfall covered" value={`${Math.round(covered * 100)}%`} sub={`${formatCr(a)} of ${formatCr(dst.shortfall_cr)}`} tone={covered >= 0.999 ? "good" : "neutral"} />
          <Impact label="Shortfall remaining" value={formatCr(gapLeft)} sub={gapLeft > 0.005 ? "needs another source or a revised sanction" : "fully covered in this scenario"} tone={gapLeft > 0.005 ? "warn" : "good"} />
          <Impact label="Buffer remaining at source" value={formatCr(bufferLeft)} sub="source stays within its original approval" tone="neutral" />
          <Impact label="Delay-risk score" value="Unchanged" sub="funds alone do not move the completion date — the scenario addresses the funding gap" tone="neutral" />
        </div>
      </section>

      {/* Advisory note */}
      <Card className="border-prism-100 ring-1 ring-prism-100">
        <CardHeader
          title="Advisory note"
          description="Generated from the figures above — ready to share for review"
          action={
            <button type="button" onClick={copy} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink ring-1 ring-inset ring-line-strong hover:bg-canvas">
              {copied ? <Check className="size-4 text-risk-low" aria-hidden /> : <ClipboardCopy className="size-4" aria-hidden />}
              {copied ? "Copied" : "Copy note"}
            </button>
          }
        />
        <CardBody className="space-y-4">
          <p className="text-base leading-relaxed text-ink">
            In <strong>{s.ministry}</strong>, project <strong>{src.project_code}</strong> is running{" "}
            <strong className="tabular">{formatCr(src.buffer_cr)}</strong> below its original approved cost after an official downward revision, while project{" "}
            <strong>{dst.project_code}</strong> in {s.match_level === "same agency" ? <>the same agency ({dst.agency})</> : <>{dst.agency}, under the same ministry</>} has already spent{" "}
            <strong className="tabular">{formatCr(dst.shortfall_cr)}</strong> beyond its sanctioned cost. PRISM suggests evaluating a reallocation of{" "}
            <strong className="tabular text-prism-700">{formatCr(a)}</strong>, subject to standard government re-appropriation approval.
          </p>
          <div className="rounded-lg border border-[#f5d9a8] bg-ev-illustrative-bg px-4 py-3 text-sm text-ev-illustrative" role="note">
            <p className="flex items-center gap-1.5 font-semibold"><Info className="size-4" aria-hidden /> Illustrative scenario — not an actual fund transfer</p>
            <p className="mt-1 leading-relaxed">{caveat}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-950">Typical next steps <span className="font-normal text-ink-subtle">(the exact route depends on the ministry&apos;s rules)</span></p>
            <ol className="mt-2 grid gap-2 text-sm text-ink-muted sm:grid-cols-2 lg:grid-cols-4">
              {[
                `Confirm the latest expenditure and revised-cost figures with ${dst.agency}.`,
                `Confirm that the savings in ${src.project_code} are not already committed.`,
                "Prepare a re-appropriation / revised-cost proposal through the ministry's finance wing.",
                "Decision by the competent authority under the applicable delegation of financial powers.",
              ].map((t, i) => (
                <li key={t} className="flex gap-2 rounded-lg bg-canvas p-3">
                  <span className="tabular inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[11px] font-bold text-white">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
            <EvidenceTag kind="OFFICIAL" /> Flash Report #490 (Aug 2026), pp. {src.source_page} and {dst.source_page}
            <EvidenceTag kind="DERIVED" /> buffer = original − revised cost; shortfall = expenditure − sanctioned cost
            <Link href={`/projects/${dst.project_code}/`} className="inline-flex items-center gap-1 font-medium text-prism-700 hover:underline">
              Destination risk profile <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </p>
        </CardBody>
      </Card>
      {children}
    </div>
    </SplitShell>
  );
}

function Impact({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "good" | "warn" | "neutral" }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border bg-surface p-4 shadow-[var(--shadow-card)]",
        tone === "good" ? "border-risk-low-line" : tone === "warn" ? "border-risk-moderate-line" : "border-line",
      )}
    >
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className={clsx("tabular mt-1.5 text-2xl font-semibold transition-colors", tone === "good" ? "text-risk-low" : tone === "warn" ? "text-risk-moderate" : "text-navy-950")}>{value}</p>
      <p className="mt-1 text-xs text-ink-subtle">{sub}</p>
    </div>
  );
}
