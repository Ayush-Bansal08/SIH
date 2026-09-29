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

const GROUP_TITLE: Record<Band, string> = {
  high: "High risk",
  elevated: "Elevated risk",
  moderate: "Moderate risk",
  low: "Low risk",
};

/**
 * Left-hand project list for the split view — deliberately simple:
 * one search box, one "Show" menu, projects grouped under plain risk headings,
 * and just the name, state and score on each row. ↑/↓ move, Enter opens.
 */
export function ProjectRail({ rows, defaultCode }: { rows: RailRow[]; defaultCode: string }) {
  const pathname = usePathname() ?? "/projects/";
  const routeCode = pathname.match(/^\/projects\/(\d{5,7})/)?.[1];
  const onIndex = !routeCode;
  const active = routeCode ?? defaultCode;
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"all" | Band>("all");
  const listRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(
    () => Object.fromEntries(BANDS.map((b) => [b, rows.filter((r) => r.band === b).length])) as Record<Band, number>,
    [rows],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = rows.filter(
      (r) => (!q || `${r.name} ${r.code} ${r.agency} ${r.state} ${r.ministry_short}`.toLowerCase().includes(q)) && (show === "all" || r.band === show),
    );
    return BANDS.map((b) => ({
      band: b,
      items: match.filter((r) => r.band === b).sort((x, y) => y.score - x.score || x.code.localeCompare(y.code)),
    })).filter((g) => g.items.length > 0);
  }, [rows, query, show]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  // Keep the open project visible in the list.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

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
      <div className="space-y-3 border-b border-line p-4">
        <Heading className="text-lg font-normal tracking-[-0.01em] text-ink">Projects</Heading>
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
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          Show
          <select
            value={show}
            onChange={(e) => setShow(e.target.value as "all" | Band)}
            className="h-9 flex-1 rounded-full border border-line-strong bg-surface px-3 text-sm text-ink focus:border-ink focus:outline-none"
          >
            <option value="all">All projects ({rows.length})</option>
            {BANDS.map((b) => (
              <option key={b} value={b}>
                {GROUP_TITLE[b]} ({counts[b]})
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="sr-only" aria-live="polite">
        {total} of {rows.length} projects shown
      </p>

      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-ink-muted">
          No project matches “{query}”.
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setShow("all");
            }}
            className="font-medium text-ink underline underline-offset-2"
          >
            Show all projects
          </button>
        </div>
      ) : (
        <div ref={listRef} onKeyDown={onKeyDown} className="flex-1 overflow-y-auto pb-2">
          {groups.map((g) => {
            const s = BAND_STYLE[g.band];
            return (
              <section key={g.band} aria-labelledby={`grp-${g.band}`}>
                <h3
                  id={`grp-${g.band}`}
                  className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface/95 px-4 py-2 text-xs font-semibold text-ink-muted backdrop-blur"
                >
                  <span className="size-2 rounded-full" style={{ background: s.fill }} aria-hidden />
                  {GROUP_TITLE[g.band]}
                  <span className="font-normal text-ink-subtle">· {g.items.length}</span>
                </h3>
                <ul className="px-2 py-1">
                  {g.items.map((r) => {
                    const selected = r.code === active;
                    return (
                      <li key={r.code}>
                        <Link
                          href={`/projects/${r.code}/`}
                          data-rail
                          data-selected={selected}
                          aria-current={routeCode === r.code ? "page" : undefined}
                          scroll={false}
                          className={clsx("flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors", selected ? "bg-ink text-white" : "hover:bg-canvas")}
                        >
                          <span className="min-w-0 flex-1">
                            <span className={clsx("block truncate text-[15px]", selected ? "text-white" : "text-ink")}>{r.name}</span>
                            <span className={clsx("block truncate text-xs", selected ? "text-white/70" : "text-ink-subtle")}>{r.state}</span>
                          </span>
                          <span className={clsx("tabular shrink-0 text-sm font-semibold", selected ? "text-white" : s.text)}>
                            {r.score.toFixed(1)}
                            <span className="sr-only"> out of 10, {BAND_META[r.band].label} risk</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </nav>
  );
}
