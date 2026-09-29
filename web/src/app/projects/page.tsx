import type { Metadata } from "next";
import { ProjectProfile } from "@/components/project/ProjectProfile";
import { heroProject, projects } from "@/lib/data";

export const metadata: Metadata = { title: "Projects" };

/** Desktop: the list on the left with the highest-priority project open on the right. Mobile: the list only. */
export default function ProjectsPage() {
  const p = heroProject ?? projects[0];
  return (
    <div className="hidden lg:block">
      <ProjectProfile p={p} titleAs="h2" />
    </div>
  );
}
