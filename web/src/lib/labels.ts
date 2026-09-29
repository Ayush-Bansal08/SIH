import type { Band, EvidenceClass, FundingStatus, ScheduleStatus } from "./types";

export const BAND_META: Record<Band, { label: string; meaning: string; order: number }> = {
  high: { label: "High", meaning: "40% or higher chance of a completion-date revision in the next report", order: 3 },
  elevated: { label: "Elevated", meaning: "20–40% chance of a completion-date revision in the next report", order: 2 },
  moderate: { label: "Moderate", meaning: "8–20% chance of a completion-date revision in the next report", order: 1 },
  low: { label: "Low", meaning: "Below 8% chance of a completion-date revision in the next report", order: 0 },
};

export const BANDS: Band[] = ["high", "elevated", "moderate", "low"];

export const EVIDENCE_META: Record<EvidenceClass, { short: string; meaning: string }> = {
  OFFICIAL: { short: "Official", meaning: "Printed in a PAIMANA Flash Report (report number and page given)" },
  DERIVED: { short: "Derived", meaning: "Calculated only from official figures" },
  "MODEL ESTIMATE": { short: "Model estimate", meaning: "PRISM early-warning score, precomputed and tested on an unseen month" },
  ILLUSTRATIVE: { short: "Illustrative", meaning: "Decision-support scenario — never an instruction or a fund transfer" },
};

export const SCHEDULE_META: Record<ScheduleStatus, { label: string; tone: "danger" | "warning" | "success" }> = {
  past_target: { label: "Past current target", tone: "danger" },
  delayed: { label: "Delayed vs original", tone: "warning" },
  on_schedule: { label: "On original schedule", tone: "success" },
};

export const ALERT_META: Record<string, { label: string; tone: "danger" | "warning" | "neutral" | "info"; evidence: "MODEL ESTIMATE" | "DERIVED" | "OFFICIAL" }> = {
  high_delay_risk: { label: "High risk of a completion-date revision next report", tone: "danger", evidence: "MODEL ESTIMATE" },
  overspent: { label: "Expenditure already above sanctioned cost", tone: "danger", evidence: "DERIVED" },
  deadline_crunch: { label: "Target date within a month, substantial work remaining", tone: "warning", evidence: "DERIVED" },
  repeat_revisions: { label: "Completion date pushed back repeatedly", tone: "warning", evidence: "DERIVED" },
  overdue_unrevised: { label: "Original target passed with no revised date", tone: "warning", evidence: "DERIVED" },
  status_check: { label: "Reported 100% complete but still listed as ongoing", tone: "info", evidence: "DERIVED" },
  verify_data: { label: "Figures need verification before use", tone: "neutral", evidence: "DERIVED" },
};

/** PRISM data-quality rules (flag, never fix) — see docs/data-quality-report.md. */
export const DQ_RULES: Record<string, { title: string; severity: "error" | "warning" | "info" }> = {
  DQ01: { title: "Expenditure more than 10× sanctioned cost", severity: "error" },
  DQ02: { title: "Expenditure 2–10× sanctioned cost", severity: "warning" },
  DQ03: { title: "Complete with no expenditure", severity: "error" },
  DQ04: { title: "Near-complete but little spent", severity: "warning" },
  DQ05: { title: "Spending far ahead of progress", severity: "warning" },
  DQ06: { title: "Progress outside 0–100%", severity: "error" },
  DQ07: { title: "Below the ₹150 Cr monitoring threshold", severity: "warning" },
  DQ08: { title: "Target completion before approval", severity: "warning" },
  DQ09: { title: "Revised completion earlier than original", severity: "info" },
  DQ10: { title: "Overdue with no revised schedule", severity: "warning" },
  DQ11: { title: "Approval date missing", severity: "warning" },
  DQ12: { title: "Invalid implementing agency", severity: "error" },
  DQ13: { title: "Physical progress went down", severity: "warning" },
  DQ14: { title: "Cumulative expenditure went down", severity: "warning" },
  DQ15: { title: "Original cost changed", severity: "warning" },
  DQ16: { title: "Duplicate project code", severity: "error" },
  DQ17: { title: "Left the list without completion", severity: "warning" },
  DQ18: { title: "Actual completion long before report", severity: "info" },
};

export const FUNDING_META: Record<FundingStatus, { label: string; tone: "danger" | "warning" | "info" | "neutral" | "success" }> = {
  overspent: { label: "Spent beyond sanction", tone: "danger" },
  revised_up: { label: "Cost revised up", tone: "warning" },
  revised_down: { label: "Cost revised down", tone: "info" },
  within_sanction: { label: "Within sanction", tone: "success" },
  revision_not_reported: { label: "Revision not yet reported", tone: "neutral" },
};
