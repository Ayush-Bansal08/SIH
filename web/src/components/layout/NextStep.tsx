import { ArrowRight } from "lucide-react";
import Link from "next/link";

/** End-of-page link to the next screen in the demo journey. */
export function NextStep({ href, label, question }: { href: string; label: string; question: string }) {
  return (
    <Link
      href={href}
      className="group mx-auto flex w-full max-w-3xl items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-6 py-5 shadow-[var(--shadow-card)] transition-all hover:border-prism-100 hover:shadow-[var(--shadow-raised)]"
    >
      <span>
        <span className="block text-sm text-ink-muted">{question}</span>
        <span className="block font-semibold text-navy-950 group-hover:text-prism-700">{label}</span>
      </span>
      <ArrowRight className="size-5 text-prism-600 transition-transform group-hover:translate-x-1" aria-hidden />
    </Link>
  );
}
