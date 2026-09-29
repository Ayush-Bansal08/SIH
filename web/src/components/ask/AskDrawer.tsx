"use client";

import { ArrowRight, ArrowUp, Eraser, FileText, MessageSquareText, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PrismMark } from "@/components/layout/Logo";
import { EvidenceTag } from "@/components/ui/risk";
import askJson from "@/data/ask.json";
import type { Ask } from "@/lib/types";
import { AnswerText, answer, type Reply } from "./AskPanel";

const ask = askJson as unknown as Ask;

interface Turn {
  id: number;
  question: string;
  reply: Reply | null;
}

/**
 * Ask PRISM, available on every page: a launcher button that opens a side panel.
 * Same grounded answers as /ask (no language model); the conversation persists while
 * navigating. On a project page it suggests a question about that project.
 */
export function AskDrawer() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const projectCode = pathname.match(/^\/projects\/(\d{5,7})/)?.[1];
  const contextual = projectCode && ask.project_lookup[projectCode] ? `Why is project ${projectCode} high risk?` : null;
  const suggestions = [...(contextual ? [contextual] : []), ...ask.suggested.filter((s) => s !== contextual)].slice(0, 5);

  const submit = useCallback((raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const id = nextId.current++;
    setTurns((t) => [...t, { id, question: q, reply: null }]);
    setInput("");
    window.setTimeout(() => setTurns((t) => t.map((x) => (x.id === id ? { ...x, reply: answer(q) } : x))), 250);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns]);

  // The full-page assistant already lives at /ask.
  if (pathname.startsWith("/ask")) return null;

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-controls="ask-drawer"
          className="fixed bottom-5 right-5 z-50 inline-flex h-12 items-center gap-2.5 rounded-full bg-ink pl-4 pr-5 text-sm font-medium text-white shadow-[var(--shadow-raised)] transition-transform hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
        >
          <MessageSquareText className="size-4" aria-hidden />
          Ask PRISM
        </button>
      )}

      {open && (
        <aside
          id="ask-drawer"
          role="dialog"
          aria-label="Ask PRISM"
          className="animate-rise fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col rounded-t-3xl border border-line bg-surface shadow-[var(--shadow-raised)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh-7rem))] sm:w-[400px] sm:rounded-3xl"
        >
          <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <PrismMark className="size-7" />
              <div>
                <p className="text-sm font-semibold text-ink">
                  Ask <span className="font-serif text-base font-normal italic">PRISM</span>
                </p>
                <p className="text-[11px] text-ink-subtle">Answers only from the prototype data, with sources</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {turns.length > 0 && (
                <button type="button" onClick={() => setTurns([])} aria-label="Clear conversation" className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-canvas">
                  <Eraser className="size-4" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setTimeout(() => launcherRef.current?.focus(), 0);
                }}
                aria-label="Close Ask PRISM"
                className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-canvas"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4" aria-live="polite">
            {turns.length === 0 && (
              <div>
                <p className="text-sm text-ink-muted">Ask about risk, reasons, schedule slippage, budget pressure or budget options.</p>
                <ul className="mt-3 space-y-2">
                  {suggestions.map((s) => (
                    <li key={s}>
                      <button type="button" onClick={() => submit(s)} className="w-full rounded-2xl px-3.5 py-2.5 text-left text-sm text-ink ring-1 ring-inset ring-line hover:bg-canvas">
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {turns.map((t) => (
              <div key={t.id} className="space-y-2.5">
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-sm text-white">{t.question}</p>
                {t.reply === null ? (
                  <p className="text-sm text-ink-subtle">Looking this up…</p>
                ) : (
                  <article className="rounded-2xl border border-line bg-canvas/60 px-3.5 py-3 text-sm">
                    {t.reply.klass && (
                      <div className="mb-2">
                        <EvidenceTag kind={t.reply.klass} />
                      </div>
                    )}
                    <div className="[&_p]:text-sm [&_li]:text-sm">
                      <AnswerText text={t.reply.text} />
                    </div>
                    {((t.reply.profile && t.reply.profile !== projectCode) || t.reply.projects.length > 0) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {t.reply.profile && t.reply.profile !== projectCode && (
                          <Link href={`/projects/${t.reply.profile}/`} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-medium text-white">
                            Open risk profile <ArrowRight className="size-3" aria-hidden />
                          </Link>
                        )}
                        {t.reply.projects.map((c) => (
                          <Link key={c} href={`/projects/${c}/`} title={ask.project_lookup[c]} className="rounded-full px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-inset ring-line-strong hover:bg-surface">
                            {c}
                          </Link>
                        ))}
                      </div>
                    )}
                    {t.reply.sources.length > 0 && (
                      <ul className="mt-3 space-y-0.5 border-t border-line pt-2 text-[11px] text-ink-subtle">
                        {t.reply.sources.map((s) => (
                          <li key={s} className="flex gap-1.5">
                            <FileText className="mt-0.5 size-3 shrink-0" aria-hidden />
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-center gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <label htmlFor="ask-drawer-input" className="sr-only">Your question</label>
            <input
              id="ask-drawer-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={contextual ?? "Ask a question…"}
              autoComplete="off"
              className="h-11 flex-1 rounded-full border border-line-strong bg-surface px-4 text-sm placeholder:text-ink-subtle focus:border-ink focus:outline-none"
            />
            <button type="submit" disabled={!input.trim()} aria-label="Ask" className="inline-flex size-11 items-center justify-center rounded-full bg-ink text-white hover:bg-navy-700 disabled:opacity-30">
              <ArrowUp className="size-4" aria-hidden />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
