"use client";

import clsx from "clsx";
import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { BAND_STYLE } from "@/components/ui/risk";
import { BAND_META, BANDS } from "@/lib/labels";
import type { Band } from "@/lib/types";

export interface RailRow {
  code: string;
  name: string;
  ministry_short: string;
  agency: string;
  state: string;
  original_cost_cr: number;
  sanctioned_cr: number;
  expenditure_cr: number;
  progress: number;
  delay: number | null;
  score: number;
  band: Band;
  verify: boolean;
}

/**
 * Left-hand project list for the split view, kept calm on purpose:
 * one search box, four plain risk tabs (one band at a time), and full project
 * names with the state and a score pill. Search looks across every band.
 * ↑/↓ move through the list, Enter opens.
 */
export function ProjectRail({ rows, defaultCode }: { rows: RailRow[]; defaultCode: string }) {
  const pathname = usePathname() ?? "/projects/";
  const routeCode = pathname.match(/^\/projects\/(\d{5,7})/)?.[1];
  const onIndex = !routeCode;
  const active = routeCode ?? defaultCode;
  const activeBand = rows.find((r) => r.code === active)?.band ?? "high";
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Band>(activeBand);
  const listRef = useRef<HTMLDivElement>(null);

  // Opening a project from elsewhere shows its tab.
  useEffect(() => setTab(activeBand), [activeBand]);

  const counts = useMemo(
    () => Object.fromEntries(BANDS.map((b) => [b, rows.filter((r) => r.band === b).length])) as Record<Band, number>,
    [rows],
  );

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      rows
        .filter((r) => (q ? `${r.name} ${r.code} ${r.agency} ${r.state} ${r.ministry_short}`.toLowerCase().includes(q) : r.band === tab))
        .sort((x, y) => y.score - x.score || x.code.localeCompare(y.code)),
    [rows, q, tab],
  );

  // Keep the open project visible in the list.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, tab]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const links = [...(listRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-rail]") ?? [])];
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next = links[Math.min(links.length - 1, Math.max(0, (i < 0 ? -1 : i) + (e.key === "ArrowDown" ? 1 : -1)))];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const Heading = onIndex ? "h1" : "h2";

  return (
    <nav
      aria-label="Projects"
      className={clsx(
        "flex flex-col rounded-2xl border border-line bg-surface lg:sticky lg:top-[7.5rem] lg:h-[calc(100dvh-8.5rem)]",
        !onIndex && "hidden lg:flex",
      )}
    >
      <div className="space-y-4 border-b border-line p-5">
        <div>
          <Heading className="text-lg font-normal tracking-[-0.01em] text-ink">Projects</Heading>
          <p className="mt-0.5 text-sm text-ink-subtle">Pick one to see its risk on the right.</p>
        </div>
        <label className="relative block">
          <span className="sr-only">Search projects</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or state"
            className="h-11 w-full rounded-full border border-line-strong bg-surface pl-10 pr-4 text-[15px] placeholder:text-ink-subtle focus:border-ink focus:outline-none"
          />
        </label>
        <div className="grid grid-cols-4 gap-1 rounded-full bg-canvas p-1" role="group" aria-label="Risk level">
          {BANDS.map((b) => {
            const on = !q && tab === b;
            return (
              <button
                key={b}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setTab(b);
                  setQuery("");
                }}
                className={clsx(
                  "rounded-full py-1.5 text-[13px] font-medium transition-colors",
                  on ? "bg-surface text-ink shadow-[var(--shadow-card)] ring-1 ring-line" : "text-ink-muted hover:text-ink",
                )}
              >
                {BAND_META[b].label}
                <span className="sr-only"> risk, {counts[b]} projects</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="px-5 pb-1 pt-3 text-xs text-ink-subtle" aria-live="polite">
        {q ? `${shown.length} of ${rows.length} projects match` : `${shown.length} of ${rows.length} projects · ${BAND_META[tab].label.toLowerCase()} risk, highest first`}
      </p>

      {shown.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-ink-muted">
          No project matches “{query}”.
          <button type="button" onClick={() => setQuery("")} className="font-medium text-ink underline underline-offset-2">
            Clear the search
          </button>
        </div>
      ) : (
        <div ref={listRef} onKeyDown={onKeyDown} className="flex-1 overflow-y-auto px-2 pb-3">
          <ul className="space-y-1">
            {shown.map((r) => {
              const selected = r.code === active;
              const s = BAND_STYLE[r.band];
              return (
                <li key={r.code}>
                  <Link
                    href={`/projects/${r.code}/`}
                    data-rail
                    data-selected={selected}
                    aria-current={routeCode === r.code ? "page" : undefined}
                    scroll={false}
                    className={clsx("flex items-start gap-3 rounded-xl px-4 py-3.5 transition-colors", selected ? "bg-ink text-white" : "hover:bg-canvas")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={clsx("line-clamp-2 text-[15px] leading-snug", selected ? "text-white" : "text-ink")}>{r.name}</span>
                      <span className={clsx("mt-1 block text-[13px]", selected ? "text-white/70" : "text-ink-subtle")}>{r.state}</span>
                    </span>
                    <span
                      className={clsx(
                        "tabular mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold",
                        selected ? "bg-white/15 text-white" : `${s.bg} ${s.text}`,
                      )}
                    >
                      {r.score.toFixed(1)}
                      <span className="sr-only"> out of 10, {BAND_META[r.band].label} risk</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
