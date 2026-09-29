import { BAND_STYLE } from "@/components/ui/risk";
import { formatInt, formatPct } from "@/lib/format";
import { BAND_META, BANDS } from "@/lib/labels";
import type { Band } from "@/lib/types";

/** Portfolio split across risk bands: one stacked bar + a legend that carries the numbers. */
export function BandDistribution({ counts, compact = false }: { counts: Record<Band, number>; compact?: boolean }) {
  const total = BANDS.reduce((s, b) => s + counts[b], 0);
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-line" aria-hidden>
        {BANDS.map((b) => (
          <div
            key={b}
            className="h-full transition-[width] duration-700 first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(counts[b] / total) * 100}%`, background: BAND_STYLE[b].fill }}
            title={`${BAND_META[b].label}: ${counts[b]}`}
          />
        ))}
      </div>
      <ul className={compact ? "mt-3 grid grid-cols-2 gap-x-4 gap-y-2" : "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"}>
        {BANDS.map((b) => {
          const s = BAND_STYLE[b];
          return (
            <li key={b} className="flex items-start gap-2">
              <s.Icon className={`mt-0.5 size-4 shrink-0 ${s.text}`} aria-hidden />
              <div>
                <p className="text-sm font-medium text-ink">
                  {BAND_META[b].label}{" "}
                  <span className="tabular font-semibold text-navy-950">{formatInt(counts[b])}</span>
                </p>
                {!compact && <p className="text-xs text-ink-subtle">{formatPct((counts[b] / total) * 100, 1)} of projects</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
