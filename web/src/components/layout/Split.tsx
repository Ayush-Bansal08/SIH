import type { ReactNode } from "react";

/** Full-width split view: a docked list on the left, the detail on the right (like an editor). */
export function SplitShell({ rail, children }: { rail: ReactNode; children: ReactNode }) {
  return (
    <div className="lg:relative lg:left-1/2 lg:w-[min(calc(100vw-2rem),100rem)] lg:-translate-x-1/2">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:items-start">
        {rail}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export const railShell =
  "flex flex-col rounded-2xl border border-line bg-surface lg:sticky lg:top-[7.5rem] lg:h-[calc(100dvh-8.5rem)]";
