import { formatMonth, formatMonths } from "@/lib/format";
import type { Project } from "@/lib/types";

const m = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).getTime() : null);

/** Planned vs current schedule on one time axis, with "today" (the report month). */
export function ScheduleTimeline({ p, asOf }: { p: Project; asOf: string }) {
  const start = m(p.dates.start) ?? m(p.dates.approval);
  const approval = m(p.dates.approval);
  const orig = m(p.dates.original_completion);
  const current = m(p.dates.expected_completion);
  const today = m(`${asOf}-01`)!;
  if (!start || !orig || !current) {
    return <p className="text-sm text-ink-muted">Dates needed for the timeline are not recorded for this project.</p>;
  }
  const points = [start, orig, current, today, approval ?? start];
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const pad = (hi - lo) * 0.04 || 1;
  const W = 800;
  const x = (t: number) => 20 + ((t - (lo - pad)) / (hi + pad - (lo - pad))) * (W - 40);
  const late = current > orig;
  const year = (t: number) => new Date(t).getFullYear();
  const years: number[] = [];
  for (let y = year(lo) + 1; y <= year(hi); y++) years.push(new Date(`${y}-01-01T00:00:00`).getTime());
  const step = Math.ceil(years.length / 8) || 1;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} 172`} className="h-auto w-full" role="img" aria-label={`Planned completion ${formatMonth(p.dates.original_completion)}, current target ${formatMonth(p.dates.expected_completion)}${late ? `, ${formatMonths(p.derived.delay_months)} later than planned` : ""}.`}>
        {years.filter((_, i) => i % step === 0).map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={24} y2={140} stroke="#eef0f4" />
            <text x={x(t)} y={164} textAnchor="middle" fontSize="13" fill="#6b7280">{year(t)}</text>
          </g>
        ))}
        {/* planned */}
        <text x={20} y={40} fontSize="13" fill="#4b5563">Planned</text>
        <rect x={x(start)} y={48} width={Math.max(2, x(orig) - x(start))} height={14} rx={4} fill="#171717" />
        {/* current */}
        <text x={20} y={86} fontSize="13" fill="#4b5563">Current</text>
        <rect x={x(start)} y={94} width={Math.max(2, x(Math.min(orig, current)) - x(start))} height={14} rx={4} fill="#8a8a85" />
        {late && <rect x={x(orig)} y={94} width={Math.max(2, x(current) - x(orig))} height={14} rx={4} fill="#b42318" fillOpacity={0.85} />}
        {late && (
          <text x={(x(orig) + x(current)) / 2} y={130} textAnchor="middle" fontSize="13" fontWeight={600} fill="#b42318">
            +{formatMonths(p.derived.delay_months)}
          </text>
        )}
        {/* today */}
        <line x1={x(today)} x2={x(today)} y1={18} y2={140} stroke="#e8871e" strokeWidth={2} strokeDasharray="4 3" />
        <text x={x(today)} y={13} textAnchor="middle" fontSize="13" fontWeight={600} fill="#b95c00">Report: {formatMonth(asOf)}</text>
      </svg>
      <figcaption className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm sm:grid-cols-4">
        <div><p className="text-xs text-ink-subtle">Approved</p><p className="font-medium text-ink">{formatMonth(p.dates.approval)}</p></div>
        <div><p className="text-xs text-ink-subtle">Started</p><p className="font-medium text-ink">{formatMonth(p.dates.start)}</p></div>
        <div><p className="text-xs text-ink-subtle">Original completion</p><p className="font-medium text-ink">{formatMonth(p.dates.original_completion)}</p></div>
        <div>
          <p className="text-xs text-ink-subtle">Current target</p>
          <p className={late ? "font-semibold text-risk-high" : "font-medium text-ink"}>{formatMonth(p.dates.expected_completion)}</p>
        </div>
      </figcaption>
    </figure>
  );
}
