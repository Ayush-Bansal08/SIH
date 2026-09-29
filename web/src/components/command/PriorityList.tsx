"use client";

import clsx from "clsx";
import { ChevronRight, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { BAND_STYLE, RiskBadge, ScoreBar } from "@/components/ui/risk";
import { formatCr } from "@/lib/format";
import { BAND_META, BANDS } from "@/lib/labels";
import type { Band, FundingStatus, ScheduleStatus } from "@/lib/types";

export interface PriorityRow {
  code: string;
  name: string;
  ministry_short: string;
  agency: string;
  state: string;
  score: number;
  band: Band;
  driver: string;
  schedule: ScheduleStatus;
  delay: number | null;
  funding: FundingStatus;
  verify: boolean;
  cost: number;
  progress: number;
  advisor: boolean;
}

type Sort = "score" | "delay" | "cost";

const INITIAL = 10;

export function PriorityList({ rows }: { rows: PriorityRow[] }) {
  const [query, setQuery] = useState("");
  const [bands, setBands] = useState<Band[]>([]);
  const [sort, setSort] = useState<Sort>("score");
  const [expanded, setExpanded] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q) || r.code.includes(q) || r.agency.toLowerCase().includes(q) || r.state.toLowerCase().includes(q)) &&
        (bands.length === 0 || bands.includes(r.band)),
    );
    const key: Record<Sort, (r: PriorityRow) => number> = {
      score: (r) => r.score,
      delay: (r) => r.delay ?? -1,
      cost: (r) => r.cost,
    };
    return [...out].sort((a, b) => key[sort](b) - key[sort](a) || a.code.localeCompare(b.code));
  }, [rows, query, bands, sort]);

  const toggleBand = (b: Band) => setBands((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b]));
  const reset = () => {
    setQuery("");
    setBands([]);
  };
  const filtered = query || bands.length;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col gap-4 border-b border-line px-6 py-5" role="search" aria-label="Filter the priority list">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-56 flex-1">
            <span className="sr-only">Search by project name, code, agency or state</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by project, agency or state"
              className="h-11 w-full rounded-full border border-line-strong bg-surface pl-10 pr-4 text-sm placeholder:text-ink-subtle focus:border-prism-500 focus:outline-none focus:ring-2 focus:ring-prism-100"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-11 rounded-full border border-line-strong bg-surface px-4 text-sm text-ink focus:border-prism-500 focus:outline-none focus:ring-2 focus:ring-prism-100">
              <option value="score">Highest risk</option>
              <option value="delay">Longest delay</option>
              <option value="cost">Largest cost</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {BANDS.map((b) => {
            const on = bands.includes(b);
            const st = BAND_STYLE[b];
            return (
              <button
                key={b}
                type="button"
                aria-pressed={on}
                onClick={() => toggleBand(b)}
                className={clsx(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium ring-1 ring-inset transition-colors",
                  on ? `${st.bg} ${st.text} ${st.ring}` : "bg-surface text-ink-muted ring-line-strong hover:bg-canvas",
                )}
              >
                <st.Icon className="size-3.5" aria-hidden />
                {BAND_META[b].label}
              </button>
            );
          })}
          <span className="ml-auto text-sm text-ink-muted" aria-live="polite">
            Showing <strong className="text-ink">{shown.length}</strong> of {rows.length}
            {filtered ? (
              <button type="button" onClick={reset} className="ml-2 font-medium text-prism-700 hover:underline">
                Clear filters
              </button>
            ) : null}
          </span>
        </div>
      </div>

      {/* List */}
      {shown.length === 0 ? (
        <div className="p-5">
          <EmptyState icon={<SearchX className="size-6" aria-hidden />} title="No projects match these filters">
            Try removing a filter or searching for a different name.
          </EmptyState>
        </div>
      ) : (
        <ol className="divide-y divide-line">
          {(expanded || filtered ? shown : shown.slice(0, INITIAL)).map((r, i) => (
            <li key={r.code} className="group relative flex gap-4 px-6 py-5 transition-colors hover:bg-prism-50/60 focus-within:bg-prism-50/60">
              <span className="tabular mt-0.5 w-6 shrink-0 text-right text-sm font-semibold text-ink-subtle">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-6 gap-y-2">
                  <div className="min-w-0">
                    <Link href={`/projects/${r.code}/`} className="font-semibold text-navy-950 after:absolute after:inset-0 hover:text-prism-700">
                      <span className="line-clamp-2">{r.name}</span>
                    </Link>
                    <p className="mt-1 text-sm text-ink-subtle">
                      {r.state} · {formatCr(r.cost, 0)}
                      {r.advisor && <Badge tone="brand" className="relative z-10 ml-2">Budget option</Badge>}
                      {r.verify && <Badge tone="neutral" className="relative z-10 ml-2">Verify data</Badge>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <ScoreBar score={r.score} band={r.band} />
                    <RiskBadge band={r.band} withTooltip={false} />
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  <span className="font-medium text-ink">Why: </span>
                  {r.driver}
                </p>
              </div>
              <ChevronRight className="mt-1 size-5 shrink-0 self-center text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-prism-700" aria-hidden />
            </li>
          ))}
        </ol>
      )}
      {!filtered && !expanded && shown.length > INITIAL && (
        <div className="border-t border-line px-6 py-4 text-center">
          <button type="button" onClick={() => setExpanded(true)} className="text-sm font-medium text-prism-700 hover:underline">
            Show all {shown.length} projects
          </button>
        </div>
      )}
    </div>
  );
}
