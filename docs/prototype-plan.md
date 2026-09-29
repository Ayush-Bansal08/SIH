# PAIMANA-PRISM — Prototype plan and data contract

Main idea: `reference/PAIMANA-PRISM_Solution_Document.md`. This file fixes what the
**SIH selection-round prototype** contains. It is small in scope and finished in quality.

> PAIMANA tells you what happened. PRISM tells you where to act next, why, and what options exist.

## Scope

**Built:** a static web app (Next.js, TypeScript, Tailwind, Recharts, Lucide) that reads local JSON.
The JSON is precomputed once, offline, from the real PAIMANA Flash Reports #486–#490 (Apr–Aug 2026).

**Not built:**

- live PAIMANA APIs, login or a database
- a model running in the browser, and no model server
- an LLM (Ask PRISM uses fixed, grounded answers)
- any real fund transfer or approval workflow
- the OCMS archive ingestion
- Hindi translation
- pixel-perfect mobile layout

## Phases

| # | Phase | Status |
|---|---|---|
| 1 | Prototype data: curated sample, precomputed scores and drivers, Advisor scenarios, Ask PRISM answers (JSON) | ✅ |
| 2 | Design system + app shell | ✅ |
| 3 | Overview + Command Center | ✅ |
| 4 | Project Explorer + Risk Profile | ✅ |
| 5 | Reallocation Advisor (hero) | ✅ |
| 6 | Evidence (incl. descriptive CUF vs non-CUF) + Ask PRISM + Methodology | ✅ |
| 7 | Polish + demo optimisation (script: `docs/demo-script.md`) | ✅ |
| 8 | QA + public deployment (guide: `docs/deployment.md`) | ✅ |

## Routes

| Route | Screen | Reads |
|---|---|---|
| `/` | Overview | portfolio.json, demo.json |
| `/command-center` | Command Center | portfolio.json, projects.json |
| `/projects` | Project Explorer | projects.json |
| `/projects/[code]` | Project Risk Profile | projects.json, advisor.json |
| `/advisor` | Reallocation Advisor | advisor.json, projects.json |
| `/evidence` | Evidence & analytics | evidence.json, portfolio.json |
| `/ask` | Ask PRISM | ask.json |
| `/methodology` | Methodology & about | evidence.json, manifest.json |

## Demo journey (about 4 minutes)

The demo cast was chosen by fixed rules in `run.py`, stored in `demo.json`:

| Step | Screen | What the judge sees |
|---|---|---|
| 1 | Overview | Official totals: 1,731 projects, ₹33.60 lakh crore revised cost. Then "from monitoring to decision intelligence". |
| 2 | Command Center | Risk bands across all 1,731 projects; the priority list |
| 3–4 | Risk Profile: **618706 Bangalore–Nidagatta Pkg. I** (NHAI) | Score 9.3/10, High. Target date is next month with 1% of the work left. 58 months behind the original date. Already spent ₹227.78 Cr beyond its sanction. |
| 5 | Advisor: featured scenario | **618762 Itarsi–Betul NH-69** (NHAI, low risk) is ₹161.94 Cr below its original cost after an official revision. It is paired with 618706 in the same agency, with a slider, a before/after view and the approval caveat. |
| 6 | Evidence | Tested on an unseen month: 155 of 201 High-band projects (77%) were actually revised in the next report. |
| 7 | Ask PRISM | "Why is project 618706 high risk?", answered with sources |

Supporting examples in the sample:

- **Medium risk:** 611570, AAI.
- **Low risk:** 611855, Railways.
- **Longest delay:** 602096, Subansiri Lower HE. It is 198 months late but has a low score, which shows that being delayed is not the same as likely to be revised next month.
- **Largest overspend:** 701386, Gosikhurd. Its ministry, DWR, has no buffer, which shows the honest "no match" case.
- **Spending far ahead of progress:** 618080.
- **Data-quality example:** 617989. Its expenditure is 89× its sanction.

## Data contract (`pipeline/data/export/`, copied to the web app in Phase 2)

| File | Contents |
|---|---|
| `portfolio.json` | Official totals for the latest report and the 5-month trend. Also portfolio-wide derived counts (delayed, overspent, reporting lag), risk-band counts over all 1,731 projects, and per-ministry benchmarks. |
| `projects.json` | The prototype sample: 59 real projects covering every band and demo case. Each has official figures with report and page; derived indicators; the score, band, statistical vs ML probabilities, top drivers and breakdown; peer comparison; 5-month history; data-quality flags; alerts. |
| `advisor.json` | Caveat, method, portfolio totals, 5 featured scenarios (source → destination → suggested amount → sentence), per-ministry buffer/shortfall table, projects excluded for verification. |
| `ask.json` | 10 intents with keywords, answer, project links and sources; a per-project "why" answer for every sample project; suggested prompts; the fallback answer. |
| `evidence.json` | The question the model answers, the test protocol, test metrics (statistical vs ML vs rule of thumb), band calibration, driver importance, sources, reconciliation, limits. |
| `demo.json` | The demo cast above, with the reason each was chosen. |
| `manifest.json` | SHA-256 and size of every file, source PDFs, evidence-class definitions. |

### Evidence classes (shown as labels in the UI)

| Label | Meaning |
|---|---|
| **OFFICIAL** | Printed in a Flash Report (report number and page given) |
| **DERIVED** | Calculated only from official figures (formula stated) |
| **MODEL ESTIMATE** | PRISM early-warning score: precomputed, tested on an unseen month |
| **ILLUSTRATIVE** | A decision-support scenario, never an instruction or a transfer |

### The risk score

- **Question:** will the official completion date be pushed back in the next monthly report?
- **Score:** 10 × the combined probability.
- **Bands:**
  - High ≥ 40%
  - Elevated 20–40%
  - Moderate 8–20%
  - Low < 8%
- **How the models combine:** logistic regression and a Cox model (statistical) are merged with XGBoost (ML), weighted by accuracy on a held-out month.
- **Explanations:** every score splits exactly into its drivers, so it is not a black box. A driver is shown only when its sentence supports its direction.
- **Measured results:** in `docs/evidence-report.md` (generated).

### Advisor rules (official figures only)

- **Buffer** = original cost − latest revised cost, where the project was officially revised downward.
- **Shortfall** = cumulative expenditure − sanctioned cost, where spending already exceeds the sanction.
- **Matching:** within the same ministry only, same agency first. Low-risk, near-complete sources are preferred.
- **Excluded until verified:** projects with error-level data-quality flags, or a revised cost below 50% of the original. That covers entry errors such as ₹0.10 Cr revised against ₹238.66 Cr original.
