import { formatCr } from "@/lib/format";

export interface Segment {
  value: number;
  color: string;
  label: string;
  pattern?: "hatch";
}

/**
 * One horizontal budget bar made of labelled segments on a shared scale.
 * Widths animate when the scenario amount changes.
 */
export function AllocationBar({ segments, scale, marker, markerLabel, caption }: { segments: Segment[]; scale: number; marker?: number; markerLabel?: string; caption: string }) {
  const pct = (v: number) => `${Math.max(0, (v / scale) * 100)}%`;
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">{caption}</p>
      <div className="relative">
        <div className="flex h-7 w-full overflow-hidden rounded-md bg-canvas ring-1 ring-inset ring-line" role="img" aria-label={`${caption}: ${segments.map((s) => `${s.label} ${formatCr(s.value)}`).join(", ")}`}>
          {segments.map((s) => (
            <div
              key={s.label}
              className="h-full transition-[width] duration-500 ease-out"
              style={{
                width: pct(s.value),
                background:
                  s.pattern === "hatch"
                    ? `repeating-linear-gradient(135deg, ${s.color} 0 6px, color-mix(in srgb, ${s.color} 55%, white) 6px 12px)`
                    : s.color,
              }}
              title={`${s.label}: ${formatCr(s.value)}`}
            />
          ))}
        </div>
        {marker !== undefined && (
          <div className="pointer-events-none absolute -top-1.5 h-10 transition-[left] duration-500" style={{ left: pct(marker) }} aria-hidden>
            <div className="h-full w-0.5 -translate-x-1/2 bg-navy-950" />
            {markerLabel && <span className="absolute left-1 top-full mt-0.5 whitespace-nowrap text-[11px] font-medium text-navy-950">{markerLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function Legend({ items }: { items: { color: string; label: string; pattern?: "hatch" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-muted">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span
            className="size-3 rounded-sm"
            style={{
              background: i.pattern === "hatch" ? `repeating-linear-gradient(135deg, ${i.color} 0 3px, color-mix(in srgb, ${i.color} 55%, white) 3px 6px)` : i.color,
            }}
            aria-hidden
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
