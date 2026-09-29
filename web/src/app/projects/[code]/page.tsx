import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectProfile } from "@/components/project/ProjectProfile";
import { getProject, projects } from "@/lib/data";

export function generateStaticParams() {
  return projects.map((p) => ({ code: p.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const p = getProject(code);
  return { title: p ? `${p.name} (${p.code})` : "Project" };
}

export default async function ProjectPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const p = getProject(code);
  if (!p) notFound();
  return <ProjectProfile p={p} />;
}
