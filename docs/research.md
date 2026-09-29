# PAIMANA-PRISM — Research consolidation (Phase 1)

Status: Phase 1 complete · Last updated 2026-09-29 · Owner: Team Predictive Node

This document consolidates everything we established before building: the
official requirement, our solution's intent, the live PAIMANA product, what the
official data actually contains, verified citations, and every conflict we found
between sources (with the resolution). Numbers in this file come from
`pipeline/data/processed/` unless a source is named.

---

## 1. Source hierarchy and what each source is

| Priority | Source | Role | Location |
|---|---|---|---|
| 1 | SIH 2026 problem statement **SIH26103** (MoSPI, DIID) | The requirement. Highest authority. | SIH 2026 catalogue; excerpts in §2 |
| 2 | *PAIMANA-PRISM Solution Document* | Our solution, story, evidence plan | `reference/PAIMANA-PRISM_Solution_Document.md` |
| 3 | Judging / evaluation material | — | **Not provided.** No criteria have been invented. |
| 4–5 | Live PAIMANA portal (Home, ReportPage, Performance Monitoring, Public Dashboard, Archive, Login) | UX, IA, vocabulary | https://paimana-proj.mospi.gov.in |
| 6 | Monthly Flash Reports #486–#490 (Apr–Aug 2026) | The data | `reference/FlashReport_2026-0{4..8}.pdf` (SHA-256 in `pipeline/data/processed/manifest.json`) |
| 7 | Screenshots of the live portal (6) | Visual analysis | provided in chat |
| 8 | External research (papers, PIB, news) | Credibility, context | §6 |

## 2. The official requirement (SIH26103) — what it actually asks

Verbatim anchors from the PS:

- Monitoring must move "**beyond descriptive monitoring towards predictive and prescriptive monitoring**".
- Build "an **AI-powered Predictive Analytics and Early Warning System** … **using Open-Source Tools and Softwares**, to identify projects that are likely to experience cost escalation, schedule delays and implementation risks **before such issues materialise**."
- Users: "**policymakers, project administrators and monitoring agencies**", for "**prioritising interventions**".
- Technical dimensions:
  - (a) statistical and predictive models for cost overruns, time overruns and implementation risks
  - (b) "**whether AI and ML techniques provide significant gains over conventional statistical methods**" in accuracy, early warning and decision support
  - (c) models on the **existing Common Upload Form (CUF) fields**, plus "**the extent to which predictive performance is attributable to the current CUF fields vis-à-vis additional variables that are not presently captured**"
- Indicative outcomes (any of): cost overrun model · time overrun model · risk scoring framework · early warning alerts · benchmarking & comparative analytics · cost escalation driver analysis · AI monitoring dashboard · LLM project intelligence assistant · documentation & deployment.
- Stated data context (April 2026): 1,981 ongoing projects · 17 ministries/departments · 22 sectors · original ₹37.13 L Cr · revised ₹42.78 L Cr · expenditure ₹20.36 L Cr.

**Implication:** Stat-vs-ML (b) and CUF-attribution (c) are *required*, not optional
differentiators. PRISM's genuinely additional contribution is the **prescriptive**
layer (Budget Buffer & Reallocation Advisor) plus provenance and data-quality
intelligence.

## 3. Conflict log

| # | Conflict | Sources | Resolution |
|---|---|---|---|
| C1 | CUF expansion: "Central Unified Format" vs "**Common Upload Form**" | Solution doc vs PS | Use **Common Upload Form** everywhere. |
| C2 | Original cost ₹37.12 L Cr vs **₹37.13 L Cr** | Solution doc vs PS / April report (₹37,12,662 Cr) | ₹37,12,662 Cr rounds to **₹37.13 L Cr**. Gap ₹5.65 L Cr is unchanged. |
| C3 | Snapshot: pitch uses April 2026 (1,981 projects); latest data is August 2026 (1,731 projects, ₹30.72 → ₹33.60 L Cr, ₹16.33 L Cr spent) | PS vs Flash Report #490 | Not contradictory. Pitch headline = April 2026 (labelled "as of April 2026, per PS"); product data = August 2026, labelled everywhere. |
| C4 | August report prints **Revised Cost = 0.00 for all 1,731 projects**; Apr–Jul print real values | Flash Report #490 vs #486–#489 | Treat 0.00 as "not reported". Carry forward each project's latest reported revised cost (July 2026 for all 1,694 that have one) and label it `revised_cost_asof`. |
| C5 | Legacy OCMS code and PMG ID present only in Apr/May (≈1,180 / 1,200 projects), blank from June | Reports | Carry forward from the latest month that had them. |
| C6 | Your doc makes a MoSPI Program Director the person who reallocates funds | Solution doc vs institutional reality | MoSPI/IPMD monitors; line ministries (and CPSE boards for internally funded projects) re-appropriate. PRISM's output is an **advisory note to the line ministry**, restricted to same-ministry / same-agency candidates, with the "recommendation, not execution" caveat. |
| C7 | "LLM via Ollama/LangChain" and "<2 s inference" | Solution doc vs a static, reliable demo | Prototype uses deterministic, template-grounded briefs over computed data. Local open LLM = production roadmap. "<2 s" shown only if measured. |
| C8 | SHAP paper "23,500+ citations, #2 most influential NeurIPS 2017" | Solution doc vs Semantic Scholar | **42,203 citations** (Semantic Scholar, Sep 2026). "#2 most influential" could not be verified → drop it. |
| C9 | Project count falls 1,981 → 1,731 (Apr → Aug) | Reports | Explained in §5.4: Railways IRPSM re-onboarding (260 → 147), completions, MoSPI-withheld records. |
| C10 | DoT jumps from 15 to 31 projects in July 2026 | Reports | July report note: "Project ID 706775 has been split into 26 sub-projects". The BharatNet sub-projects are therefore not independent observations; Phase 2 groups them for model evaluation. |

## 4. PAIMANA portal — research findings

### 4.1 Information architecture (live)

- **Utility bar:** skip link · Hindi/English toggle · accessibility widget.
- **Header:** MoSPI identity · **ADD PROJECT / UPDATE** (→ `paimana-crip.mospi.gov.in`) · **REPORTS** (→ `/User/Login`) · PAIMANA wordmark.
- **Nav:** Home · Publications ▾ (Project Monitoring `/ReportPage`, Performance Monitoring `/ProjectMonitoring`) · Dashboard ▾ (Public `/Home/PublicDashboardNew`).
- **Home:** hero carousel → Ministry-Wise / Sector-Wise tabs with a vertical ministry list and 6 KPI tiles → State-wise map → What's New → High Value Projects → media → partner logos → app "Coming Soon" → footer (IPMD contact: 011-23455604, `dir-ipmd[at]mospi[dot]gov[dot]in`; developed by NeGD).
- **ReportPage:** Report Type (Monthly Flash / Quarterly) → Month or Quarter → PDF. Archive by financial year.
- **Public Dashboard:**
  - filters: Sector, Ministry/Department, States/UTs, Project Cost (All / >500 / ≤500), Month & Year
  - KPIs: Project Count, Original Approved Cost, Latest Revised Cost, Cumulative Expenditure
  - Charts/Data toggles; CSV/XLSX export

### 4.2 Visual language

- Dark near-black surfaces (~`#1B1C1F`), deep navy band (~`#0A0A6B`), report headers navy (~`#1A237E`).
- PAIMANA cyan (~`#1A82BF`) nav and wordmark; saffron/orange accent (logo dot, ADD PROJECT CTA); mustard selected state (~`#8F6406`).
- Geometric sans (Montserrat-like); line-art KPI icons with ⓘ info buttons.
- Report charts: 3-D bars, funnel chart for categories, dual-ring donuts encoding two measures, bubble charts with overlapping labels.

### 4.3 UX audit

| Area | Observation (from the live site / screenshots) | PRISM response |
|---|---|---|
| Does well | Clear scope line; strong government identity; consistent KPI vocabulary with ⓘ definitions; ministry/sector pivots; public filters + CSV/XLSX export; bilingual toggle; accessibility widget; monthly cadence + archive | Keep all of these, including vocabulary and export |
| Dated | Hero carousel fills the first screen, no data above the fold; letter-spaced hero type | Data above the fold; plain headings |
| Contrast | MoSPI name in header is near-invisible grey on black; low-contrast grey labels | WCAG AA tokens, light-first + dark mode |
| Misleading states | Dashboard KPIs show **"₹ 0" while loading** | Skeletons; never render 0 for unknown |
| Hierarchy | Three overlapping routes to reports (REPORTS button → login, Publications, Dashboard) | One clear Reports/Evidence route |
| Discoverability | No public search by name/code; no project page or deep link; truncated names; unexplained abbreviations (MoM, DWR RD & GR) | Search + deep-linkable project pages; full names with abbreviations as secondary |
| Filtering | Cost bands only >500 / ≤500; no progress, slippage or risk filters | Filter chips incl. risk band, slip, progress, NER, Mega/Major |
| Project detail | 5 fields per card; no timeline, trend, peers or "why" | Full risk profile with drivers, forecast, peers, data quality |
| Visualisation | 3-D, funnel for categories, dual-measure donuts; no text alternatives | Honest 2-D charts, each with a data table |
| Forward-looking | None: no risk, no early warning, no prescriptive guidance | The whole PRISM layer |

## 5. What the official data contains (Phase 1 extraction)

### 5.1 Extraction result

- 5 reports · **9,321** project-month rows · **2,111** distinct projects · **1,731** in the latest (Aug 2026) snapshot.
- **855 / 855 reconciliation checks pass:** every overview KPI, the Table 1 grand total, all 17 ministry totals, every "Total (n)" subtotal and every HML sector count. See `docs/reconciliation-report.md`.
- **32 rows hand-verified field by field** against an independent transcription (`pipeline/tests/test_spot_check.py`).
- 0 unrecognised table rows.

### 5.2 Fields available (per project, per month)

Project code · name · implementing agency · ministry · sector (→ HML category) · state(s) · date of approval · start date · original/target DoC · revised DoC · original cost · revised cost (Apr–Jul) · cumulative expenditure · physical progress %. Plus Legacy OCMS code and PMG ID (Apr–May), NER membership (Table 5), completed projects with **actual completion date** (Table 3), and newly added projects (Table 4). Full definitions: `docs/data-dictionary.md`.

### 5.3 Portfolio facts (August 2026 snapshot; derived from official rows)

| Fact | Value |
|---|---|
| Projects with a revised DoC later than the original (schedule slip) | **1,083 of 1,731 (63%)**; median slip 22 months; 511 slipped ≥ 24 months |
| Original target date already passed | 981 projects |
| Revised cost above original (latest reported) | **446 projects, +₹3.82 L Cr** |
| Revised cost below original | **290 projects, −₹0.92 L Cr** (real "buffers" exist) |
| Mega (≥ ₹1,000 Cr) / Major | 715 / 1,016 (official page-4 figures match) |
| NER projects (official Table 5) | 209 |

### 5.4 Panel dynamics (Apr → Aug 2026)

- **1,181 month-over-month events** where a project's revised DoC was pushed later (728 projects). This is a real, forward-looking early-warning target within the public data.
- 76 month-over-month revised-cost increases (72 in July) — too few for a standalone cost-escalation early-warning label.
- **227 completed projects** with actual completion dates (Table 3). 88 of the 222 with dates finished after their original target (median 27 months late); 85 of the 139 with revised costs overran.
- Why projects leave the list (evidence-classified exits):

| Exit reason | Count |
|---|---|
| Railways IRPSM re-onboarding (per the report's own note) | 114 |
| Withheld by MoSPI for inconsistent expenditure (IDs listed in report notes) | 28 |
| Temporarily absent, then back | 8 |
| Unexplained | 48 |

### 5.5 Data-quality findings (flagged, never fixed)

537 findings (5 error · 372 warning · 160 info) across 17 rules; full list in `docs/data-quality-report.md`. Headline examples:

- **617989** (NH-167 Krishna bridge): cumulative expenditure **₹16,713.20 Cr** against a sanctioned **₹187.61 Cr** (89×) — almost certainly an entry/unit error (Aug 2026 report, p. 109).
- **617936, 618415:** 100% physical progress with ₹0 expenditure.
- **615820, 615821:** implementing agency recorded as "INVALID CO.".
- 24 projects past their original target with no revised DoC; 136 month-over-month decreases in *cumulative* expenditure.

### 5.6 Non-CUF signals hiding in the text (for PS dimension (c))

Descriptive only (not causal; Phase 2 tests them properly). Share of projects with schedule slip; baseline is 63%:

| Signal parsed from project name | n | Slipped | Median slip |
|---|---|---|---|
| Tunnel | 15 | 93% | 26 m |
| Loan-assisted (JICA / World Bank / ADB) | 18 | 83% | 8.5 m |
| Greenfield | 97 | 79% | 13 m |
| Bridge | 50 | 74% | 19 m |
| "Balance work" (re-tendered contract) | 55 | 71% | 10 m |
| EPC contract | 336 | 67% | 11.5 m |
| **HAM (hybrid annuity) contract** | 43 | **16%** | 0 m |

Contract mode, funding source, loan assistance and terrain are **not CUF fields**; this is the kind of evidence dimension (c) asks for.

## 6. Citation verification

Status: all five research anchors verified against primary sources. Details and the exact wording to use are in `docs/citations.md`.

## 7. External data for the CUF-Gap experiment (feasibility)

| Variable | Source | Access | Plan |
|---|---|---|---|
| Construction-material prices (cement, steel, bitumen, WPI) | Office of the Economic Adviser, DPIIT — WPI 2011-12 & 2022-23 series | Public download | Phase 2 |
| Rainfall anomaly by state / sub-division | IMD via data.gov.in "Rainfall in India" | Public download | Phase 2 |
| State election window | Election Commission of India schedules | Public | Phase 2 (optional) |
| Terrain / region | Derived (NER, Himalayan states) | — | Phase 2 |
| Text-derived fields (§5.6) | Official report text | Already extracted | Phase 2 |

## 8. Implications for Phase 2 (modelling) — decided now

1. **Targets.**
   - (i) Time overrun (slip months / slipped yes-no) on the snapshot.
   - (ii) **Early warning:** P(revised DoC pushed later within the next month), trained on Apr→Jul transitions and **tested on Jul→Aug** (strict time-based split).
   - (iii) Cost overrun (revised > original) on the 1,694 projects with a revised cost.
2. **Leakage guard.** Features for a month may use only that month's and earlier reports.
3. **Exclusions.** `error`-severity DQ rows are excluded from training and shown as "flagged for verification".
4. **Labels for backtest.** 227 completed projects (Table 3) + the monthly slip events.
5. **Honesty.** The 20-year OCMS archive is not public. The prototype is trained on five public monthly reports and says so; the OCMS archive is the production path.
