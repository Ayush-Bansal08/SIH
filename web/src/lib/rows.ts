import type { RailRow } from "@/components/project/ProjectRail";
import type { PriorityRow } from "@/components/command/PriorityList";
import { topDriver } from "@/components/project/StatusBadges";
import { inAdvisorScenario, projects } from "./data";

export function priorityRows(): PriorityRow[] {
  return projects.map((p) => ({
    code: p.code,
    name: p.name,
    ministry_short: p.ministry_short,
    agency: p.agency,
    state: p.state,
    score: p.risk.score,
    band: p.risk.band,
    driver: topDriver(p),
    schedule: p.derived.schedule_status,
    delay: p.derived.delay_months,
    funding: p.derived.funding_status,
    verify: p.data_quality.verify,
    cost: p.official.original_cost_cr,
    progress: p.official.physical_progress_pct,
    advisor: inAdvisorScenario(p.code),
  }));
}

export function railRows(): RailRow[] {
  return projects.map((p) => ({
    code: p.code,
    name: p.name,
    ministry_short: p.ministry_short,
    agency: p.agency,
    state: p.state,
    original_cost_cr: p.official.original_cost_cr,
    sanctioned_cr: p.derived.sanctioned_cr,
    expenditure_cr: p.official.expenditure_cr,
    progress: p.official.physical_progress_pct,
    delay: p.derived.delay_months,
    score: p.risk.score,
    band: p.risk.band,
    verify: p.data_quality.verify,
  }));
}

export function sampleStates(): string[] {
  return [...new Set(projects.map((p) => p.state))].sort();
}

export function sampleMinistries(): string[] {
  return [...new Set(projects.map((p) => p.ministry_short))].sort();
}
