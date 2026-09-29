import clsx from "clsx";
import { CircleAlert, CircleCheck, CircleDot, TriangleAlert } from "lucide-react";
import { BAND_META } from "@/lib/labels";
import type { Band, EvidenceClass } from "@/lib/types";
import { EVIDENCE_META } from "@/lib/labels";
import { Tooltip } from "./Tooltip";

export const BAND_STYLE: Record<Band, { text: string; bg: string; ring: string; fill: string; Icon: typeof TriangleAlert }> = {
  high: { text: "text-risk-high", bg: "bg-risk-high-bg", ring: "ring-risk-high-line", fill: "#b42318", Icon: TriangleAlert },
  elevated: { text: "text-risk-elevated", bg: "bg-risk-elevated-bg", ring: "ring-risk-elevated-line", fill: "#dc6803", Icon: CircleAlert },
  moderate: { text: "text-risk-moderate", bg: "bg-risk-moderate-bg", ring: "ring-risk-moderate-line", fill: "#eaaa08", Icon: CircleDot },
  low: { text: "text-risk-low", bg: "bg-risk-low-bg", ring: "ring-risk-low-line", fill: "#17b26a", Icon: CircleCheck },
};

/** Risk band as icon + word (never colour alone). */
export function RiskBadge({ band, size = "sm", withTooltip = true }: { band: Band; size?: "sm" | "md"; withTooltip?: boolean }) {
  const s = BAND_STYLE[band];
  const badge = (
    <span
      className={clsx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset",
        s.bg,
        s.text,
        s.ring,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
      )}
    >
      <s.Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
      {BAND_META[band].label}
      <span className="sr-only"> risk</span>
    </span>
  );
  return withTooltip ? <Tooltip content={BAND_META[band].meaning}>{badge}</Tooltip> : badge;
}

/** Score chip for dense tables: "9.3" with a band-coloured bar. */
export function ScoreBar({ score, band }: { score: number; band: Band }) {
  const s = BAND_STYLE[band];
  return (
    <span className="inline-flex items-center gap-2" aria-label={`Risk score ${score.toFixed(1)} of 10, ${BAND_META[band].label}`}>
      <span className={clsx("tabular w-7 text-right text-sm font-semibold", s.text)}>{score.toFixed(1)}</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line" aria-hidden>
        <span className="block h-full rounded-full" style={{ width: `${Math.max(3, score * 10)}%`, background: s.fill }} />
      </span>
    </span>
  );
}

/** Semicircular 0–10 gauge. */
export function RiskGauge({ score, band, size = 180 }: { score: number; band: Band; size?: number }) {
  const s = BAND_STYLE[band];
  const r = 80;
  const c = Math.PI * r;
  const frac = Math.min(1, Math.max(0, score / 10));
  return (
    <figure className="flex flex-col items-center" aria-label={`PRISM risk score ${score.toFixed(1)} out of 10, ${BAND_META[band].label} risk`}>
      <svg width={size} height={size * 0.6} viewBox="0 0 200 120" role="img" aria-hidden>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#e2e5eb" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke={s.fill}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
          style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.2,0.7,0.2,1)" }}
        />
        <text x="100" y="92" textAnchor="middle" className="tabular" fontSize="38" fontWeight="700" fill="#0a0a0a">
          {score.toFixed(1)}
        </text>
        <text x="100" y="114" textAnchor="middle" fontSize="12" fill="#6b7280">
          out of 10
        </text>
      </svg>
      <figcaption className="mt-1">
        <RiskBadge band={band} size="md" />
      </figcaption>
    </figure>
  );
}

const EV_STYLE: Record<EvidenceClass, string> = {
  OFFICIAL: "bg-ev-official-bg text-ev-official",
  DERIVED: "bg-ev-derived-bg text-ev-derived",
  "MODEL ESTIMATE": "bg-ev-model-bg text-ev-model",
  ILLUSTRATIVE: "bg-ev-illustrative-bg text-ev-illustrative",
};

/** Data-honesty label: where a number comes from. */
export function EvidenceTag({ kind, detail }: { kind: EvidenceClass; detail?: string }) {
  const meta = EVIDENCE_META[kind];
  return (
    <Tooltip content={detail ? `${meta.meaning}. ${detail}` : meta.meaning}>
      <span
        tabIndex={0}
        className={clsx(
          "inline-flex shrink-0 items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
          EV_STYLE[kind],
        )}
      >
        {meta.short}
      </span>
    </Tooltip>
  );
}

/** "Source: Flash Report #490 (Aug 2026), Table 6, p. 109" */
export function SourceNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx("text-xs text-ink-subtle", className)}>Source: {children}</p>;
}
