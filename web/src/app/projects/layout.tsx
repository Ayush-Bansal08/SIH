import type { ReactNode } from "react";
import { SplitShell } from "@/components/layout/Split";
import { ProjectRail } from "@/components/project/ProjectRail";
import { heroProject, projects } from "@/lib/data";
import { railRows } from "@/lib/rows";

/**
 * Split view for all /projects pages: the project list stays docked on the left
 * (it persists across navigation), the selected project's profile opens on the right.
 */
export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <SplitShell rail={<ProjectRail rows={railRows()} defaultCode={heroProject?.code ?? projects[0].code} />}>{children}</SplitShell>
  );
}
