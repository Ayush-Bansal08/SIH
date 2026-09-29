import clsx from "clsx";
import { Info } from "lucide-react";
import { useId, type ReactNode } from "react";

/**
 * Accessible tooltip: shows on hover and on keyboard focus, and its text is
 * exposed to screen readers via aria-describedby. Pure CSS, no JS state.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const id = useId();
  return (
    <span className={clsx("group/tt relative inline-flex", className)}>
      <span aria-describedby={id} className="inline-flex">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={clsx(
          "pointer-events-none invisible absolute left-1/2 z-50 w-max max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md bg-navy-950 px-2.5 py-1.5 text-left text-xs font-normal leading-snug text-white opacity-0 shadow-[var(--shadow-raised)] transition-opacity duration-150",
          "group-hover/tt:visible group-hover/tt:opacity-100 group-focus-within/tt:visible group-focus-within/tt:opacity-100",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        )}
      >
        {content}
      </span>
    </span>
  );
}

/** A small focusable ⓘ button with a tooltip (PAIMANA uses ⓘ next to KPI labels). */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip content={children}>
      <button
        type="button"
        aria-label={`About: ${label}`}
        className="inline-flex size-5 items-center justify-center rounded-full text-ink-subtle hover:text-prism-700"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
    </Tooltip>
  );
}
