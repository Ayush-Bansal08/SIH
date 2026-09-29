// Types for the precomputed prototype data (see docs/prototype-plan.md, "Data contract").

export type Band = "high" | "elevated" | "moderate" | "low";
export type EvidenceClass = "OFFICIAL" | "DERIVED" | "MODEL ESTIMATE" | "ILLUSTRATIVE";
export type ScheduleStatus = "past_target" | "delayed" | "on_schedule";
export type FundingStatus = "overspent" | "revised_up" | "revised_down" | "within_sanction" | "revision_not_reported";

export interface Driver {
  key: string;
  label: string;
  text: string;
  direction: "raises" | "lowers";
  log_odds: number;
  impact_points: number;
  data: string;
}

export interface HistoryPoint {
  month: string;
  progress_pct: number | null;
  expenditure_cr: number | null;
  expected_completion: string | null;
  revised_cost_cr: number | null;
}

export interface Project {
  code: string;
  name: string;
  ministry: string;
  ministry_short: string;
  sector: string;
  hml_category: string;
  agency: string;
  state: string;
  states: string[];
  ner: boolean;
  cost_category: string;
  dates: {
    approval: string | null;
    start: string | null;
    original_completion: string | null;
    revised_completion: string | null;
    expected_completion: string | null;
  };
  official: {
    original_cost_cr: number;
    revised_cost_cr: number | null;
    revised_cost_asof: string | null;
    expenditure_cr: number;
    physical_progress_pct: number;
  };
  derived: {
    sanctioned_cr: number;
    delay_months: number | null;
    months_to_target: number | null;
    time_elapsed_pct: number | null;
    spent_pct_of_sanction: number | null;
    cost_change_pct: number | null;
    date_revisions_tracked: number;
    schedule_status: ScheduleStatus;
    funding_status: FundingStatus;
  };
  risk: {
    probability: number;
    score: number;
    band: Band;
    statistical_probability: number;
    ml_probability: number;
    models: Record<"logit" | "cox" | "xgb" | "rf", number>;
    drivers: Driver[];
    breakdown: { driver: string; label: string; log_odds: number }[];
  };
  peers: {
    group: string;
    projects: number;
    median_delay_months: number | null;
    median_risk_score: number | null;
    risk_percentile: number | null;
  };
  history: HistoryPoint[];
  data_quality: { flags: string[]; verify: boolean; large_downward_revision: boolean; excluded_from_advisor: boolean };
  alerts: string[];
  first_seen: string;
  newly_added: string | null;
  source: { report: string; month: string; table: string; page: number };
}

export interface MinistryBenchmark {
  key: string;
  label: string;
  projects: number;
  original_cost_cr: number;
  sanctioned_cr: number;
  expenditure_cr: number;
  share_delayed: number;
  median_delay_months: number;
  share_cost_revised_up: number | null;
  cost_escalation_cr: number;
  mean_risk_score: number;
  high_risk: number;
  elevated_risk: number;
  overspent: number;
}

export interface Portfolio {
  as_of: string;
  report: { number: number; month: string; origin: string };
  official: {
    ongoing_projects: number;
    line_ministries: number;
    original_cost_cr: number;
    revised_cost_cr: number;
    expenditure_cr: number;
    expenditure_pct_of_revised: number;
    commissioned_during_month: number;
    newly_added_during_month: number;
    ner_ongoing_projects: number;
    source_page: number;
  };
  trend: {
    month: string;
    report_number: number;
    ongoing_projects: number;
    original_cost_cr: number;
    revised_cost_cr: number;
    expenditure_cr: number;
  }[];
  derived: {
    projects: number;
    delayed_projects: number;
    median_delay_months: number;
    cost_revised_up_projects: number;
    overspent_projects: number;
    overspent_clean_projects: number;
    mean_risk_score: number;
    risk_bands: Record<Band, number>;
    reporting_lag: { completed_with_dates: number; median_lag_months: number; share_over_12_months: number };
  };
  risk_bands: { band: Band; label: string; threshold: number; meaning: string; projects: number }[];
  ministries: MinistryBenchmark[];
  sample: { projects: number; note: string };
}

export interface AdvisorParty {
  project_code: string;
  project_name: string;
  agency: string;
  state_label: string;
  original_cost_cr: number;
  sanctioned_cr: number;
  expenditure_cr: number;
  physical_progress_pct: number;
  risk_score: number;
  risk_band: Band;
  source_page: number;
  buffer_cr?: number;
  shortfall_cr?: number;
}

export interface Scenario {
  id: string;
  ministry: string;
  ministry_short: string;
  match_level: "same agency" | "same ministry";
  suggested_amount_cr: number;
  share_of_shortfall: number;
  source: AdvisorParty & { buffer_cr: number };
  destination: AdvisorParty & { shortfall_cr: number };
  sentence: string;
  evidence: { buffer: string; shortfall: string };
}

export interface Advisor {
  caveat: string;
  method: string;
  totals: {
    buffer_projects: number;
    buffer_cr: number;
    shortfall_projects: number;
    shortfall_cr: number;
    recommendations: number;
    matched_cr: number;
    same_agency: number;
    unmatched_shortfall_projects: number;
  };
  scenarios: Scenario[];
  ministries: {
    ministry: string;
    ministry_short: string;
    projects: number;
    buffer_projects: number;
    buffer_cr: number;
    shortfall_projects: number;
    shortfall_cr: number;
    matched_cr: number;
    unmatched_shortfall_cr: number;
    recommendations: number;
  }[];
  excluded_for_verification: string[];
}

export interface AskIntent {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  projects: string[];
  sources: string[];
  class: EvidenceClass;
}

export interface Ask {
  disclaimer: string;
  suggested: string[];
  intents: AskIntent[];
  projects: Record<string, { code: string; answer: string; sources: string[] }>;
  project_lookup: Record<string, string>;
  fallback: string;
}

export interface Evidence {
  generated_at: string;
  question: string;
  protocol: {
    train_months: string[];
    calibration_month: string;
    test_month: string;
    test_label_month: string;
    scored_month: string;
  };
  models: Record<string, { label: string; track: string; in_fusion: boolean }>;
  fusion_weights: Record<string, number>;
  test: {
    n: number;
    positives: number;
    high_flagged: number;
    high_correct: number;
    high_precision: number;
    high_recall: number;
    auc: Record<"fused" | "logit" | "cox" | "xgb" | "rf" | "rule", number>;
    best_rule: string;
    bands: { band: Band; n: number; slipped: number; observed_rate: number | null; mean_predicted: number | null }[];
  };
  stat_vs_ml: {
    rows: {
      metric: string;
      logistic: number;
      cox: number;
      xgboost: number;
      random_forest: number;
      fused: number;
      rule_of_thumb: number;
      better_track: string;
    }[];
    verdict: string;
  };
  driver_importance: { driver: string; label: string; share: number; data: string }[];
  bands: { band: Band; threshold: number; meaning: string }[];
  scoring_time: { projects: number; seconds: number; hardware: string };
  data: {
    sources: { label: string; month: string; file: string; sha256: string; origin: string }[];
    reconciliation: { checks: number; passed: number; failed: number };
    data_quality: Record<string, number>;
    dq_rules: { rule: string; title: string; severity: "error" | "warning" | "info"; findings: number }[];
    reporting_lag: { completed_with_dates: number; median_lag_months: number; share_over_12_months: number };
  };
  cuf_comparison: {
    cuf_fields: string[];
    baseline: { projects: number; share_delayed: number; median_delay_months: number; share_cost_revised_up: number };
    signals: {
      key: string;
      signal: string;
      projects: number;
      share_delayed: number;
      median_delay_months: number;
      share_cost_revised_up: number;
      difference_pts: number;
    }[];
    recommended_fields: { field: string; evidence: string }[];
    external_data: { indicator: string; status: string; why: string }[];
    note: string;
  };
  cause_check: {
    flagged_high: number;
    top_driver_matches: number;
    any_top3_matches: number;
    share_top_driver: number | null;
    share_any_top3: number | null;
    published_causes: string[];
    observable_proxies: { driver: string; cause: string }[];
    most_common_top_drivers: { driver: string; projects: number }[];
  };
  limits: string[];
}

export interface DemoPick {
  code: string;
  reason: string;
}

export interface Demo {
  hero_project: DemoPick | null;
  featured_scenario: string | null;
  archetypes: Record<string, DemoPick | null>;
}
