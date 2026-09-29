# PAIMANA-PRISM

**Predictive Risk Intelligence System for MoSPI** — Team Predictive Node · SIH 2026 · PS **SIH26103**
(*Use case on web-based integrated project-monitoring platform*, MoSPI · Smart Automation · Software)

PAIMANA records what has already happened to India's central infrastructure
projects (₹150 crore and above). PRISM adds the forward-looking layer the problem statement
asks for: which projects are heading for cost and time overruns, **why**, and
where budget slack already exists to act on them — built only on official
PAIMANA data and open-source tools.

## Repository

| Path | Contents |
|---|---|
| `reference/` | Official source material: PAIMANA Flash Reports #486–#490 (Apr–Aug 2026), solution document |
| `pipeline/` | Python: Flash Report extraction, reconciliation, data quality, and the offline prototype data build (+ tests) — see `pipeline/README.md` |
| `docs/` | Prototype plan & data contract, research, data dictionary, verified citations, generated evidence / reconciliation / data-quality reports |
| `web/` | The prototype web app — `npm run dev`, `npm test`, `npm run build` (see `web/README.md`) |

## Status — SIH selection-round prototype (plan: `docs/prototype-plan.md`)

| Phase | Scope | Status |
|---|---|---|
| — | Flash Report extraction (5 reports, 1,731 projects) | ✅ 855/855 reconciliation checks |
| 1 | Prototype data: curated sample, precomputed scores & drivers, Advisor scenarios, Ask PRISM answers | ✅ 103 tests |
| 2 | Design system + app shell (`web/`, live at `/design-system`) | ✅ |
| 3 | Overview & Command Center | ✅ |
| 4 | Project Explorer & Risk Profile | ✅ |
| 5 | Reallocation Advisor (hero) | ✅ |
| 6 | Evidence, Ask PRISM & Methodology | ✅ 24 ask-match checks |
| 7 | Polish & demo optimisation (`docs/demo-script.md`) | ✅ |
| 8 | QA & deployment-ready (`docs/deployment.md`) | ✅ 46/46 e2e · 0 axe violations · 0 vulnerabilities |

## Data honesty

Every number in PRISM is labelled **OFFICIAL**, **DERIVED** or **MODEL ESTIMATE**, with its source report and month. Official data is never altered; implausible values are flagged for verification (`docs/data-quality-report.md`).
