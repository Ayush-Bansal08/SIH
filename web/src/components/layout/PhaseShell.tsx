import { Hammer } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui/primitives";

/** Temporary body for screens scheduled in a later phase (keeps navigation complete). */
export function PhaseShell({
  eyebrow,
  title,
  description,
  phase,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  phase: number;
  children?: ReactNode;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {children}
      <EmptyState icon={<Hammer className="size-6" aria-hidden />} title={`This screen is built in Phase ${phase}`} action={<LinkButton href="/design-system/" variant="secondary">View the design system</LinkButton>}>
        The navigation, data and components are in place; the screen itself arrives in its phase.
      </EmptyState>
    </>
  );
}
