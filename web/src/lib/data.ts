// Static, build-time access to the precomputed prototype data.
import advisorJson from "@/data/advisor.json";
import askJson from "@/data/ask.json";
import demoJson from "@/data/demo.json";
import evidenceJson from "@/data/evidence.json";
import portfolioJson from "@/data/portfolio.json";
import projectsJson from "@/data/projects.json";
import type { Advisor, Ask, Demo, Evidence, Portfolio, Project } from "./types";

export const portfolio = portfolioJson as unknown as Portfolio;
export const projects = projectsJson as unknown as Project[];
export const advisor = advisorJson as unknown as Advisor;
export const ask = askJson as unknown as Ask;
export const evidence = evidenceJson as unknown as Evidence;
export const demo = demoJson as unknown as Demo;

const byCode = new Map(projects.map((p) => [p.code, p]));

export function getProject(code: string): Project | undefined {
  return byCode.get(code);
}

export const heroProject = demo.hero_project ? getProject(demo.hero_project.code) : undefined;
export const featuredScenario =
  advisor.scenarios.find((s) => s.id === demo.featured_scenario) ?? advisor.scenarios[0];

const advisorCodes = new Set(advisor.scenarios.flatMap((s) => [s.source.project_code, s.destination.project_code]));

export function inAdvisorScenario(code: string): boolean {
  return advisorCodes.has(code);
}

/** Portfolio-wide shortfall above sanction, only projects whose figures pass verification. */
export const financialPressure = {
  projects: advisor.totals.shortfall_projects,
  amount_cr: advisor.totals.shortfall_cr,
};

export const REPORT_LABEL = `Flash Report #${portfolio.report.number}`;
export const AS_OF_LABEL = new Date(`${portfolio.as_of}-01T00:00:00`).toLocaleDateString("en-IN", {
  month: "long",
  year: "numeric",
});
