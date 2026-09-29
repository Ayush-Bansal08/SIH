"use client";

import clsx from "clsx";
import { ArrowRight, ArrowUp, ChevronDown, Eraser, FileText, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PrismMark } from "@/components/layout/Logo";
import { EvidenceTag } from "@/components/ui/risk";
import askJson from "@/data/ask.json";
import { matchQuestion } from "@/lib/askMatch";
import type { Ask, EvidenceClass } from "@/lib/types";

const ask = askJson as unknown as Ask;

export interface Reply {
  text: string;
  sources: string[];
  projects: string[];
  klass?: EvidenceClass;
  profile?: string;
}
interface Turn {
  id: number;
  question: string;
  reply: Reply | null;
}

export function answer(question: string): Reply {
  const m = matchQuestion(question, ask.intents, ask.project_lookup);
  switch (m.kind) {
    case "project": {
      const a = ask.projects[m.code];
      return { text: a.answer, sources: a.sources, projects: [], klass: "MODEL ESTIMATE", profile: m.code };
    }
    case "intent": {
      const i = ask.intents.find((x) => x.id === m.id)!;
      return { text: i.answer, sources: i.sources, projects: i.projects, klass: i.class };
    }
    case "not_in_sample":
      return {
        text: `Project ${m.code} is not in the prototype sample, so I have no verified answer for it. The sample holds ${Object.keys(ask.project_lookup).length} real projects from the latest Flash Report — try one of them, for example ${ask.suggested.at(-1)?.match(/\d{5,7}/)?.[0] ?? ""}.`,
        sources: [],
        projects: [],
      };
    case "which_project":
      return {
        text: `Which project do you mean? Give its code — for example “Why is project ${ask.suggested.at(-1)?.match(/\d{5,7}/)?.[0] ?? ""} high risk?” — or open any project from the Explorer and use its Ask PRISM button.`,
        sources: [],
        projects: [],
      };
    default:
      return { text: ask.fallback, sources: [], projects: [] };
  }
}

/** Render stored answer text: numbered lines become a list, the rest paragraphs. */
export function AnswerText({ text }: { text: string }) {
  const lines = text.split("\n").filter(Boolean);
  const blocks: ({ type: "p"; text: string } | { type: "ol"; items: string[] })[] = [];
  for (const line of lines) {
    const m = line.match(/^\d+\.\s+(.*)$/);
    const last = blocks[blocks.length - 1];
    if (m) {
      if (last?.type === "ol") last.items.push(m[1]);
      else blocks.push({ type: "ol", items: [m[1]] });
    } else blocks.push({ type: "p", text: line });
  }
  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-ink">
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <p key={i}>{b.text}</p>
        ) : (
          <ol key={i} className="list-decimal space-y-1 pl-5 marker:font-semibold marker:text-ink-subtle">
            {b.items.map((it, j) => <li key={j}>{it}</li>)}
          </ol>
        ),
      )}
    </div>
  );
}

export function AskPanel() {
  const params = useSearchParams();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const asked = useRef(false);

  const submit = useCallback((raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const id = nextId.current++;
    setTurns((t) => [...t, { id, question: q, reply: null }]);
    setInput("");
    // A short pause so the answer reads as a reply; the answer itself is precomputed.
    window.setTimeout(() => {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, reply: answer(q) } : x)));
    }, 280);
  }, []);

  useEffect(() => {
    const q = params.get("q");
    if (q && !asked.current) {
      asked.current = true;
      submit(q);
    }
  }, [params, submit]);

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section aria-label="Conversation" className="flex min-h-[30rem] flex-col rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
        <div className="flex-1 space-y-6 p-6" aria-live="polite">
          {/* Welcome */}
          <div className="flex gap-3">
            <PrismMark className="size-8 shrink-0" />
            <div className="rounded-2xl rounded-tl-sm bg-canvas px-4 py-3 text-[15px] leading-relaxed text-ink">
              <p>Ask about the portfolio, a project&apos;s risk, budget options or how the score works. I only answer from the prototype data — every answer lists its sources.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ask.suggested.map((s) => (
                  <button key={s} type="button" onClick={() => submit(s)} className="rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-prism-700 ring-1 ring-inset ring-prism-100 hover:bg-prism-50">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {turns.map((t) => (
            <div key={t.id} className="space-y-4">
              <div className="flex justify-end gap-3">
                <p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-navy-800 px-4 py-2.5 text-[15px] text-white">{t.question}</p>
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-800" aria-hidden>
                  <UserRound className="size-4" />
                </span>
              </div>
              <div className="flex gap-3">
                <PrismMark className="size-8 shrink-0" />
                {t.reply === null ? (
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-canvas px-4 py-3.5" aria-label="PRISM is looking this up">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="size-2 animate-bounce rounded-full bg-ink-subtle" style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                  </div>
                ) : (
                  <article className="animate-rise min-w-0 max-w-[92%] rounded-2xl rounded-tl-sm border border-line bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
                    {t.reply.klass && (
                      <div className="mb-2">
                        <EvidenceTag kind={t.reply.klass} />
                      </div>
                    )}
                    <AnswerText text={t.reply.text} />
                    {(t.reply.projects.length > 0 || t.reply.profile) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {t.reply.profile && (
                          <Link href={`/projects/${t.reply.profile}/`} className="inline-flex items-center gap-1 rounded-lg bg-prism-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-prism-700">
                            Open risk profile <ArrowRight className="size-3.5" aria-hidden />
                          </Link>
                        )}
                        {t.reply.projects.map((c) => (
                          <Link key={c} href={`/projects/${c}/`} className="inline-flex max-w-full items-center gap-1 rounded-lg px-2.5 py-1 text-sm text-prism-700 ring-1 ring-inset ring-prism-100 hover:bg-prism-50" title={ask.project_lookup[c]}>
                            <span className="font-semibold">{c}</span>
                            <span className="max-w-48 truncate text-ink-muted">{ask.project_lookup[c]}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                    {t.reply.sources.length > 0 && (
                      <div className="mt-3 border-t border-line pt-2.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Sources</p>
                        <ul className="mt-1 space-y-0.5 text-xs text-ink-muted">
                          {t.reply.sources.map((s) => (
                            <li key={s} className="flex gap-1.5">
                              <FileText className="mt-0.5 size-3 shrink-0" aria-hidden />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form
          className="flex items-center gap-2 border-t border-line p-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
            inputRef.current?.focus();
          }}
        >
          <label htmlFor="ask-input" className="sr-only">Your question</label>
          <input
            id="ask-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Why is project 618706 high risk?"
            autoComplete="off"
            className="h-11 flex-1 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] placeholder:text-ink-subtle focus:border-prism-500 focus:outline-none focus:ring-2 focus:ring-prism-100"
          />
          <button type="submit" disabled={!input.trim()} aria-label="Ask" className="inline-flex size-11 items-center justify-center rounded-lg bg-navy-800 text-white hover:bg-navy-900 disabled:opacity-40">
            <ArrowUp className="size-5" aria-hidden />
          </button>
          {turns.length > 0 && (
            <button type="button" onClick={() => setTurns([])} aria-label="Clear conversation" className={clsx("inline-flex size-11 items-center justify-center rounded-lg text-ink-muted ring-1 ring-inset ring-line-strong hover:bg-canvas")}>
              <Eraser className="size-4" aria-hidden />
            </button>
          )}
        </form>
      </section>

      <details className="group rounded-2xl border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
          More questions you can ask
          <ChevronDown className="size-5 shrink-0 text-ink-subtle transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <ul className="grid gap-x-6 gap-y-2 border-t border-line px-6 py-5 sm:grid-cols-2">
          {ask.intents.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => submit(i.question)} className="text-left text-sm text-prism-700 hover:underline">
                {i.question}
              </button>
            </li>
          ))}
        </ul>
      </details>

      <p className="px-2 text-center text-sm leading-relaxed text-ink-muted">
        <strong className="font-semibold text-ink">Grounded by design.</strong> {ask.disclaimer} There is no language model in this prototype: questions are matched to
        precomputed answers, so it cannot invent a number. Production path: a locally hosted, retrieval-grounded model on government premises.
      </p>
    </div>
  );
}
