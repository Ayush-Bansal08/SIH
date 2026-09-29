# PAIMANA-PRISM — Master Solution Document & PPT Generation Prompt
**Team: Predictive Node | SIH26103 | Smart India Hackathon 2026**
**Problem Statement: Use case on web-based integrated project-monitoring platform | Theme: Smart Automation | Category: Software**

---

## HOW TO USE THIS DOCUMENT

This document has two jobs:

1. **It is the single source of truth for the project** — the idea, the architecture, the evidence, the story, and the priorities, all in one place, so the team never has to say "what did we decide again?"
2. **Section 9 is a ready-to-paste prompt.** Copy Section 9 alone into a fresh Claude conversation (with PPT/slide creation ability) and it will generate presentation-ready content for all 6 slides, in the exact structure, tone, and evidence-level a SIH panel expects — because it already contains all the research, numbers, and storytelling baked in.

Do not skip Sections 1–8 even if you only care about the PPT — they are what make Section 9 accurate. If the team's numbers, features, or research change, update Sections 1–8 first, then regenerate Section 9's output.

---

## 1. PROBLEM STATEMENT — FULL CONTEXT

- **PS ID:** 26103
- **Title:** Use case on a web-based integrated project-monitoring platform
- **Issued by:** MoSPI (Ministry of Statistics and Programme Implementation), Data Informatics & Innovation Division
- **Theme:** Smart Automation | **Category:** Software

**What exists today — PAIMANA:**
MoSPI already runs a portal called PAIMANA that tracks large government infrastructure projects using CUF (Central Unified Format) data, plus an older historical archive (OCMS). PAIMANA's monthly Flash Report currently monitors **1,981 projects** worth ₹150 crore or more each, across 17 Central Ministries/Departments and 22 sectors.

**The exact, verified numbers (April 2026 MoSPI Flash Report — use these consistently, they are NOT conflicting figures, they are original/revised/gap of the same report):**
- Original approved cost of the 1,981 projects: **₹37.12 lakh crore**
- Current revised cost: **₹42.78 lakh crore**
- Gap between original and revised: **₹5.65 lakh crore**
- (For context on trend: in Jan 2024, 431 of 1,821 monitored projects had already overrun by ₹4.80L Cr — 18.41% of original cost. In Feb 2024 it was ₹4.92L Cr on 1,902 projects. This shows the overrun problem has been growing steadily for years, not a one-off blip — useful ammunition if a judge asks "is this a real trend or one bad report?")

**The core gap PAIMANA has today:** it is purely **descriptive and reactive**. It tells officials a project is late or over-budget only *after* it has already happened, via quarterly/monthly status reports. There is no predictive layer, no early-warning signal, and no guidance on *what to do* about a flagged project. The problem statement itself explicitly asks for a shift "beyond descriptive monitoring toward predictive AND prescriptive monitoring" — this exact phrase is your strongest anchor point; the ministry told you what they want, and most competing teams will only deliver the "predictive" half.

---

## 2. THE SOLUTION — PAIMANA-PRISM, FULL A-TO-Z

**Full name:** PRISM = Predictive Risk Intelligence System for MoSPI
**One-line pitch:** PAIMANA-PRISM sits on top of the existing PAIMANA database and turns it from a rear-view mirror into a windshield — flagging which of the 1,981 projects need intervention *before* the money is lost, explaining exactly why, and recommending where the money to fix it can come from.

### 2.1 The end-to-end pipeline (in plain language, then technical)

**Plain-language version (use this for the actual pitch — this is what non-technical judges should hear):**
1. We pull in the government's existing project data — nothing new to collect, no new reporting burden on any official.
2. We run two independent "opinions" on every project: one from classical statistics, one from modern machine learning — because we don't assume ML is automatically better, we *test* it.
3. We combine both opinions into one simple 0–10 risk score per project.
4. For every risky project, we explain *why* it's risky, in plain English, not just a number — top 3 reasons, always.
5. We go one step further than anyone else: for projects trending under budget, we spot where financial slack exists, and suggest — never execute — where that slack could help a struggling project in the same ministry.
6. All of this is delivered through a dashboard and a chatbot-style assistant that only ever repeats numbers the model actually computed — it cannot make things up.

**Technical version (for the architecture diagram / technical approach slide):**
1. **Data Ingestion Layer** — PAIMANA CUF API (monthly) + OCMS historical archive (~20 years of past project data).
2. **Dual-Track Prediction Engine:**
   - **Statistical Engine:** Multivariate Regression + Survival Analysis (Cox Proportional Hazards) — predicts *time-to-delay*, not just a binary "will it be late" flag.
   - **ML Engine:** XGBoost + Random Forest, validated with a **time-based train/test split** (never trains on future data relative to a project's timeline — avoids leakage).
   - Both engines output calibrated probabilities so they are directly comparable.
3. **Risk Fusion Engine** — merges both tracks into one accuracy-weighted composite **0–10 risk score**, real-time inference target <2 seconds.
4. **SHAP Explainability Layer** — for every score, surfaces the top 3 driving factors in plain language. No black box.
5. **CUF-Gap Analysis Engine** — quantifies exactly how much prediction accuracy improves when external macroeconomic data (steel/cement price index, monsoon/weather data, election-cycle flags, etc.) is added on top of the fields the government already collects. This proves, with a number, what the government is currently missing.
6. **Portfolio Budget Buffer & Reallocation Advisor** (the newest, most differentiating feature — see 2.2 below).
7. **Two delivery surfaces:**
   - **Monitoring Dashboard** — geospatial risk map, what-if simulation, Web UI.
   - **LLM Briefing Assistant** — retrieval-grounded (answers only from verified computed data, not free generation) — auto-generates project briefs on demand.
8. **End user:** MoSPI Policymaker / Program Director / Administrator.

### 2.2 THE HERO FEATURE — Portfolio Budget Buffer & Reallocation Advisor

This is your single most important differentiator. Treat it as a first-class feature with its own slide space and its own architecture box — not a footnote.

**What it does:** Moves the tool from "is this project risky?" (predictive) to "where can I actually get the money to fix it?" (prescriptive) — directly answering the problem statement's own ask.

**How it works:**
1. Instead of a single point-estimate of final project cost, expose the **confidence interval / range** the statistical model already computes internally (e.g., "likely to land between ₹480cr and ₹540cr"). This is not a new model — it's surfacing information the pipeline already has.
2. Compare that range to the approved/revised budget:
   - Trending **under** budget → the project has a **buffer** (real financial slack).
   - Trending **over** budget → the project has a **shortfall** (needs more funds).
3. Group projects by shared Ministry/Agency — the actual level at which government funds are reallocatable under Indian budgeting rules.
4. Surface a recommendation such as: *"Agency X has ₹40cr of buffer sitting in Project A (running under budget). Project C in the same agency is trending ₹35cr over. Consider reallocation."*

**Critical framing — repeat this every time the feature is mentioned, in the pitch and on the slide:** Government fund reallocation between projects requires formal approval (re-appropriation orders, sanction rules) — PRISM is a **recommendation / simulation tool**, never something that executes fund transfers. The correct sentence is: *"Here's where reallocation could help, if your approval process allows it."* This caveat is what makes the feature credible to judges who understand real government budgeting, instead of sounding naive.

### 2.3 Unique Value Proposition (UVP) — the "why us" arguments

- **Honest "Stat vs. ML" test:** We don't assume ML is better — we mathematically test it against classical statistics and report both, transparently.
- **Policy-grade explainability, no black boxes:** Every high-risk alert lists its top 3 drivers in plain language.
- **Anti-hallucination Gov-LLM:** The briefing assistant is strictly retrieval-grounded — it can only speak to verified, computed data, so it cannot fabricate numbers to a policymaker.
- **100% open-source & secure:** Built entirely on open frameworks (XGBoost, local LLMs via Ollama), meaning zero licensing cost, zero vendor lock-in, and — critically — **no government data ever leaves government premises**, satisfying data-localization norms.
- **CUF-Gap Analysis:** Proves, with a number, exactly how much better predictions get when specific new fields are added — giving the ministry a concrete, evidence-backed recommendation for what to start collecting.
- **Prescriptive, not just predictive:** The Reallocation Advisor is the one thing most competing teams will not build, because everyone else stops at a risk score.

---

## 3. THE STORYTELLING FRAMEWORK (use throughout the entire pitch, not just one slide)

### 3.1 The Hero Feature vs. The Hero Persona — know the difference and use both

- **Hero *feature* of the pitch:** the Risk Fusion Engine feeding into the Portfolio Budget Buffer & Reallocation Advisor. This is the thing that makes you different from every other team building this PS. Give it the most airtime.
- **Hero *persona* of the demo narrative:** the **MoSPI Program Director / Joint Secretary** who owns portfolio oversight of the 1,981 projects. This is the "main character" whose Monday morning you are improving. Give this persona a name in the pitch (e.g., "Meet Mr./Ms. [Name], Program Director at MoSPI") — a named, specific persona is dramatically more memorable to judges than an abstract "the user."

### 3.2 The one-sentence hero narrative (use as an opener or closer)

> "Every quarter, a MoSPI Program Director is accountable for ₹42+ lakh crore across nearly 2,000 projects — but today's PAIMANA only tells them what already went wrong. PRISM gives them a ranked, explained, evidence-backed shortlist of where to intervene *before* it goes wrong, and where the budget slack already exists to fix it."

### 3.3 The "before / after" contrast (use as a visual or a spoken beat in the demo)

- **Before (today):** The Program Director scrolls a long, undifferentiated PDF/portal status report. All 1,981 projects look equally important. They find out about a ₹40cr overrun the same month the news does.
- **After (with PRISM):** The Program Director opens a dashboard. 15 projects are flagged red with a risk score and 3 plain-language reasons each. One flagged project has a matching sibling project in the same ministry sitting on unused budget. They act with 3 months of runway instead of 0.

### 3.4 The "why this matters globally, not just to us" beat (for credibility, use early in the pitch)

> "This isn't a hypothetical Indian problem — Oxford researcher Bent Flyvbjerg's landmark study of 258 infrastructure projects across 20 countries and 70 years found 9 out of 10 projects overrun their budget, and that rate has not improved in seven decades of traditional project management. The tools being used to manage these projects globally are still reactive. PRISM is our attempt to break that pattern, starting with India's own ₹42-lakh-crore portfolio."

### 3.5 The "we tested our assumptions, we didn't just assume" beat (for the innovation/rigor point judges raised)

> "We didn't assume machine learning beats classical statistics — we built both, ran them side by side on the same data, and are reporting honestly which one wins and when. That's the difference between a hackathon pitch and something a ministry could actually trust."

### 3.6 Storytelling rules — what to avoid
- Do not open with the architecture diagram. Open with the persona and the pain (the "before"), then reveal the architecture as the solution to that pain.
- Do not let the LLM assistant or the dashboard become the headline feature in the story — they are delivery mechanisms, not the innovation. The innovation is the Reallocation Advisor and the CUF-Gap proof.
- Do not use more than one persona in the demo narrative — Judge feedback specifically asked for "clearer prioritization of the most important decision," and splitting the story across 3 personas (policymaker / agency / public) dilutes that. Keep the 3-persona table for the Impact slide only, as a supporting "who else benefits" moment — not as the main story.

---

## 4. SCOPE — LOCK IT WITHOUT SHRINKING THE VISION

The team's instruction: **do not limit the ambition of the idea/vision document — pitch the full system — but lock a concrete, buildable scope for the actual prototype** that will be demoed in later rounds.

### 4.1 Full vision (pitch this without apology — this is the "idea" stage, ambition is expected)
All six architecture components in Section 2.1, including the Reallocation Advisor, the CUF-Gap Engine, the LLM assistant, and the geospatial dashboard, framed as the complete system PRISM will become.

### 4.2 Locked prototype scope (what actually gets built and demoed — be disciplined here)
Recommended locked scope for the working prototype, in priority order (see Section 5 for why this order):
1. Risk Fusion Engine running on a real or realistic historical dataset, producing an actual 0–10 score per project.
2. SHAP explainability output for at least a handful of real flagged projects.
3. A basic version of the Reallocation Advisor — even a single convincing worked example (one buffer project + one shortfall project in the same "ministry" grouping) is enough to prove the concept.
4. A simple dashboard view (even a clean table/chart is fine — it does not need to be the full geospatial UI to prove the point).
5. **Explicitly descoped for the prototype stage (state this openly if asked, it shows maturity, not weakness):** the full LLM briefing assistant can be a lightweight/mocked version for the prototype round; the full 20-year OCMS ingestion pipeline can run on a representative sample rather than the complete archive; the production-grade geospatial map can be a simplified chart.

**Why say this out loud to judges:** naming your locked scope explicitly ("here is exactly what's live vs. what's roadmap") is a credibility signal, not a confession of weakness — it shows you understand delivery discipline, which is exactly what Judge 2's feedback was implicitly asking for ("clearer prioritization").

---

## 5. PRIORITY RANKING — WHERE TO SPEND YOUR TIME AND SLIDE SPACE

Ranked by "how much this affects whether you win," not by build order:

1. **The Reallocation Advisor worked example.** Highest priority. It is the single feature that makes you different from every other team on this PS. Get at least one real, screenshot-able output before finals.
2. **A backtest validation number.** Take completed historical projects, simulate what your risk score would have said partway through, and check against what actually happened. This is the single most direct answer to "prove this beats current methods," which is the exact feedback you received. See Category B in Section 7.
3. **The CUF-Gap lift number.** Turn "we quantify the gap" into an actual measured number (e.g., an AUC or MAE delta with/without external fields). This directly answers the "innovation needs more work" feedback.
4. **The Stat-vs-ML honest comparison table.** Cheap to produce once #2 exists, since it's the same pipeline run twice. Strengthens your UVP #1 claim with real evidence instead of a claim.
5. **SHAP-drivers-match-known-causes check.** Good bonus evidence, low additional effort once #2 is done — compare your model's top SHAP drivers against the independently published root causes (land acquisition, price escalation) from the Institution of Engineers India study in Section 6.
6. **Inference speed measurement.** Lowest priority — either measure it for real or soften the "<2 second" language until you have.

**Slide-space priority (do NOT split attention evenly across all 6 slides):** Spend disproportionate depth on the Technical Approach slide (where the Reallocation Advisor and CUF-Gap number live) and the Feasibility & Viability slide's innovation justification. The title slide, the references slide, and the "problem exists" section of slide 2 should be the leanest, fastest-to-read parts of the deck — judges already know infrastructure cost overruns are a problem; don't over-invest time explaining that.

---

## 6. EVIDENCE — CATEGORY A: RESEARCH-BASED (fully researched, cite exactly as below)

Use these to establish that your *method choices* are legitimate and proven elsewhere — not to prove your own numbers. Place each citation next to the specific architecture box it validates, not all bunched on one references slide.

### A1. ML/Statistical methods work for this problem class

**Hamdan, Thneibat & Hyari (2025), "Predicting cost overrun in construction projects using machine learning algorithms: the case of Jordan," *Engineering, Construction and Architectural Management* (Emerald).**
- Tested 15 ML regression algorithms on **836 public construction projects** in Jordan.
- Best performer: CatBoost (R² = 0.883); Stacking Regressor close behind (R² = 0.881).
- **XGBoost Regressor — your exact model family — achieved R² = 0.844**; Random Forest Regressor achieved R² = 0.802.
- Top predictive factors: variation orders (41.16% feature importance), excessive quantities (21.86%), budgeted costs (20.96%).
- **Use this line:** *"XGBoost independently achieves R²=0.844 predicting cost overruns on an 836-project public dataset — the same core algorithm our ML Engine uses."*

**Explainable XGBoost + SHAP paper (2026), *Asian Journal of Civil Engineering* (Springer).**
- Combines XGBoost with SHAP specifically for cost-overrun prediction; evaluated via MAE and R², optimized with Randomized Search + 5-fold cross-validation.
- **Caveat — state this honestly if asked:** the dataset is 1,000 *simulated* observations (project size, cost, material costs, schedule pressure, delay risk, design changes, macroeconomic indicators like price index and inflation). Good for methodology precedent only — do not present it as real-world proof.

### A2. Survival analysis precedent

**Li & Ashuri (2021), "Proportional Cox Hazards Model to Quantify the Likelihood of Underestimation in Transportation Projects," *Journal of Construction Engineering and Management* (ASCE).**
- This is explicitly the **first known application** of survival-analysis methods to the construction bidding process, using a Cox proportional hazards model to forecast the likelihood of cost/schedule underestimation.
- Uses project, bidder, and external market characteristics as covariates.
- **Use this line:** *"Time-to-delay modeling via Cox proportional hazards was first applied to construction cost estimation by Li & Ashuri (2021, ASCE) — our Statistical Engine builds directly on this established, peer-reviewed technique rather than inventing a new one."*
- Note: exact accuracy/concordance figures were not accessible (paywalled) — cite for methodological precedent, not a performance number.

### A3. Scale and stakes — global context (your strongest independent-credibility citation)

**Flyvbjerg, Holm & Buhl (2002) and related work.**
- Across **258 transportation infrastructure projects in 20 nations on 5 continents**, **9 out of 10 projects had a cost overrun** — and this rate has been constant across the 70-year period studied; cost estimates have not improved over time.
- By project type: rail averages **44.7%** overrun, bridges/tunnels **33.8%**, roads **20.4%** (differences statistically significant).
- Separately, the original 258-project study found costs underestimated in ~9 of 10 projects, averaging **28%** above estimates.
- McKinsey's independent estimate: roughly nine in ten megaprojects go over budget; rail averages 44.7% overrun with demand overestimated by 51.4%; bridges/tunnels ~35%; roads ~20%.
- **Use this line (strong opener or credibility anchor):** *"This isn't unique to India — Flyvbjerg's landmark 258-project, 20-country, 70-year study found 9 in 10 infrastructure projects overrun budget, with zero improvement in forecasting accuracy over seven decades of reactive project management."*

### A4. SHAP is a validated, standard technique (not a homemade hack)

**Lundberg & Lee (2017), "A Unified Approach to Interpreting Model Predictions," NeurIPS.**
- **23,500+ citations**, ranked the **#2 most influential NeurIPS 2017 paper** as of the 2026 edition — about as canonical as ML interpretability research gets.
- Core contribution: identifies a new class of additive feature-importance measures and proves a unique solution exists within that class with desirable theoretical properties, mathematically unifying six prior interpretability methods.
- **Use this line:** *"SHAP isn't a homemade heuristic — it's the field-standard, game-theoretically grounded interpretability method (Lundberg & Lee, NeurIPS 2017, 23,500+ citations)."*

### A5. Precedent using MoSPI's own data source (your single best piece of evidence)

**Study of 30 mega infrastructure projects in India, *Journal of The Institution of Engineers (India): Series A* (2018).**
- Analyzes time and cost overrun in **30 mega infrastructure projects in India using the same MoSPI quarterly-report web portal** PAIMANA is built on — sectors include road transport & highways, power, atomic energy, metro/urban development, petroleum & petrochemicals.
- **Road projects were found to have the largest time and cost overruns** of any sector studied.
- Most common identified causes: **delay in land acquisition, delay in forest clearance, law-and-order problems, general price escalation, high capital cost, poor contractor performance, delay in equipment supply.**
- **Why this matters most:** if your model's SHAP output on real data also surfaces land acquisition / price escalation as top drivers, you can honestly say *"our model independently rediscovered causes that peer-reviewed research already found using the same MoSPI data source"* — a genuine, non-fabricated validation claim.
- **Do NOT claim these papers used PAIMANA/OCMS data themselves** — they did not. Frame them as prior art proving the *techniques* are sound; your project is the first to apply them to India's own live PAIMANA/OCMS dataset. This distinction matters if a judge asks what's genuinely new about your submission.

---

## 7. EVIDENCE — CATEGORY B: PROJECT-BASED (build & test — PLACEHOLDERS, fill in once run)

These do not exist yet. They require you to actually run your pipeline. Do not fabricate numbers here — leave the placeholder exactly as marked until you have a real result, and only fill it in with what you actually measured.

### B1. Backtest validation — HIGHEST PRIORITY
**What to do:** Take a set of completed historical projects (from public MoSPI reports or the OCMS-style archive). Simulate what your risk score would have said at an early completion checkpoint (e.g., 25% or 50% complete). Compare against what actually happened.
**Placeholder to fill:**
> "Backtesting on **[N]** completed projects, PRISM's risk score at the **[X]%**-completion mark correctly flagged **[Y] out of [Z]** eventual overruns, on average **[M] months** before the overrun was officially reported."

### B2. CUF-Gap lift number
**What to do:** Train the model once using only existing CUF fields, once with added external macro fields (price indices, monsoon data, etc.). Report the accuracy delta.
**Placeholder to fill:**
> "Using only the **[N]** fields PAIMANA currently captures, our model achieves an AUC/R² of **[X]**. Adding **[N2]** external indicators (**[list them]**) improves this to **[Y]** — a **[Y-X]** point gain directly attributable to data the government does not currently collect."

### B3. Stat vs. ML honest comparison table
**What to do:** Run both engines on the same historical projects; report side-by-side performance metrics (e.g., Cox concordance index vs. XGBoost AUC/PR-AUC).
**Placeholder to fill:**

| Metric | Statistical Engine (Cox/Regression) | ML Engine (XGBoost) | Winner & when |
|---|---|---|---|
| [metric] | [value] | [value] | [e.g., "Stats wins on sparse early-stage data; XGBoost pulls ahead once more history accumulates"] |

### B4. Reallocation Advisor worked example
**What to do:** Using real or realistic sample portfolio data, group by ministry/agency and produce at least one genuine output.
**Placeholder to fill:**
> "In **[Ministry/Agency name]**, Project **[A]** is trending **₹[X]cr** under its revised budget, while Project **[C]** in the same agency is trending **₹[Y]cr** over. PRISM recommends evaluating a reallocation of up to **₹[Z]cr**, subject to standard government re-appropriation approval."

### B5. SHAP-drivers-match-known-causes check
**What to do:** Compare your model's top-3 SHAP drivers for known-delayed historical projects against the causes independently published in the Institution of Engineers India study (A5 above — land acquisition, price escalation, etc.).
**Placeholder to fill:**
> "For **[N]** flagged high-risk projects, PRISM's top SHAP driver matched an independently published root cause (land acquisition delay / price escalation / contractor performance) in **[X]%** of cases."

### B6. Inference speed
**What to do:** Time an actual inference run of the Risk Fusion Engine end-to-end.
**Placeholder to fill:**
> "Measured end-to-end inference time on [hardware spec]: **[X] seconds** per project / **[Y] seconds** for a full 1,981-project batch."

---

## 8. NARRATIVE PRIORITIES — WHAT MUST LAND WITH JUDGES

In order of importance, these are the beliefs a judge must walk away holding:

1. **"This team actually tested their idea, they didn't just theorize it."** → carried by Category B evidence, especially B1 and B2.
2. **"This is prescriptive, not just predictive — exactly what the ministry asked for."** → carried by the Reallocation Advisor (Section 2.2), stated explicitly against the problem statement's own wording.
3. **"This is rigorous, not hand-wavy — they tested stat vs. ML honestly instead of assuming."** → carried by B3 and UVP #1.
4. **"This is credible at government scale — realistic about approval processes, not naive."** → carried by the reallocation "recommendation, not execution" framing (Section 2.2).
5. **"This solves one person's real Monday-morning problem, not an abstract feature list."** → carried by the persona narrative (Section 3).
6. **"The team understands the global context, not just India's own numbers."** → carried by the Flyvbjerg citation (A3).

---

## 9. ═══ THE PPT-GENERATION PROMPT — COPY EVERYTHING BELOW THIS LINE ═══

*(Paste everything from here to the end of the document into a new Claude conversation to generate the actual slide content/script for all 6 slides.)*

---

You are generating presentation CONTENT (text, structure, and speaker narrative — not final design) for a 6-slide Smart India Hackathon 2026 idea-round pitch deck. The team is "Predictive Node," solving PS 26103 (MoSPI web-based project-monitoring platform) with a solution called **PAIMANA-PRISM**.

**Overall style rules — apply to every slide:**
- Minimal jargon. Every technical term (SHAP, XGBoost, Cox proportional hazards, etc.) must be immediately followed by a 5–10 word plain-English translation the first time it appears on a slide.
- Every slide must be readable and understandable by a judge in under 20 seconds — short bullets, not paragraphs.
- Weave the storytelling throughline from Section 3 above across the whole deck — do not confine storytelling to one slide. Specifically: open Slide 2 with the persona/pain ("before"), not the architecture. Close Slide 5 (Impact) by returning to that same persona's "after."
- Every research claim must be attributed in a short, readable form (e.g., "— Flyvbjerg, Oxford, 258-project global study") — never a bare number with no source.
- Every project-based evidence placeholder from Section 7 above that is still unfilled must be marked clearly as `[TO BE FILLED FROM PROTOTYPE TESTING]` in the generated content — never invent a number to fill it.
- Keep the Reallocation Advisor and the CUF-Gap number as the most prominent, most visually emphasized elements of the deck — they are the differentiators. Do not let the dashboard/LLM-assistant features outweigh them in slide space.

**Now generate content for each of these 6 slides, in order:**

---

### SLIDE 1 — Title Slide
**Must include:** Problem Statement ID (26103), Problem Statement Title (verbatim, from Section 1), Theme (Smart Automation), PS Category (Software), Team Name (Predictive Node), Team ID (leave blank/placeholder), Solution name (PAIMANA-PRISM) with tagline.
**Must NOT include:** any technical detail, any claims, any numbers — this slide is pure identification, keep it minimal and clean.

### SLIDE 2 — Problem, Solution, UVP, and Architecture
**Must include, in this order:**
1. A 1–2 sentence persona-driven opening pain statement (from Section 3.3 "Before") — not a generic "PAIMANA is reactive" bullet.
2. Problem Existing — 3 bullets max, using the verified numbers from Section 1 (₹37.12L Cr original → ₹42.78L Cr revised → ₹5.65L Cr gap), labeled clearly as original/revised/gap so they don't look like conflicting numbers.
3. Proposed Solution — 4 bullets summarizing the pipeline from Section 2.1, in plain language, each bullet naming one architecture stage.
4. UVP — 4-5 bullets from Section 2.3, each one sentence, benefit-first phrasing (what the judge gets, not what the tech is).
5. A system architecture flowchart description (6 levels, top to bottom) exactly as structured in Section 2.1's technical version — Input Layer → Statistical/ML split → Risk Fusion → SHAP Explainability → Dashboard/LLM split → MoSPI Policymaker. Include the Reallocation Advisor as a visible 7th node branching off the Risk Fusion Engine, not omitted.
**Must NOT include:** the full Reallocation Advisor mechanics (save the depth for Slide 3) — just name it here as a headline feature so it's flagged early.

### SLIDE 3 — Technical Approach (the most important slide — give it the most depth)
**Must include, in this order:**
1. Data Ingestion Layer description (plain language: "we use the government's existing data, no new reporting burden").
2. Statistical Engine Path (3 steps) and ML Engine Path (4 steps) as two parallel tracks, each step named in plain language with the jargon translated inline, per Section 2.1.
3. Risk Fusion Engine — the merge point, with the 0–10 score explained in one sentence.
4. Explainability & Driver Analysis (SHAP) — explained in plain language, with the citation from Section 6 (A4) shown as a small credibility footnote.
5. **A dedicated, visually prominent box for the Portfolio Budget Buffer & Reallocation Advisor** (Section 2.2) — full mechanics: point estimate → range → buffer/shortfall comparison → ministry-level grouping → recommendation. Include the "recommendation, not execution" caveat verbatim, in a visible small-text disclaimer, not buried.
6. **A dedicated small box for the CUF-Gap Analysis Engine** with the placeholder from Section 7 (B2) inserted, marked `[TO BE FILLED FROM PROTOTYPE TESTING]`.
7. A "Validated Approach" footnote strip along the bottom citing A1 (Jordan XGBoost R²=0.844), A2 (Li & Ashuri Cox precedent), and A4 (SHAP NeurIPS) briefly, each in under 12 words.
8. Tech stack chips: Python, pandas, statsmodels, lifelines, XGBoost, scikit-learn, SHAP, FastAPI, PostgreSQL, React, Plotly/D3, LangChain, Docker.
**Must NOT include:** long paragraphs explaining how XGBoost or Cox regression mathematically work — name them, translate them in one clause, move on.

### SLIDE 4 — Feasibility & Viability
**Must include:**
- Left box (Feasibility): Technical, Data Compliance, Innovation, Operational, Economic — 5 sub-points from Section 2.3/2.1, each one sentence, plain language.
- The Innovation sub-point specifically must now explicitly name the Reallocation Advisor and the CUF-Gap number as the answer to "what makes this different" — this directly resolves the judge feedback from the internal round; do not leave this vague.
- Right box (Viability): Market/Impact (with the ₹42.78L Cr and 1% savings math), Policy & Relevance, Investment & ROI, Scalability & Retention — from the original deck content.
- Bottom row: Technical Challenges (risk + mitigation) and Business/User Challenges (risk + mitigation), reused from the original deck content, but strengthen the Business/User Challenges mitigation to explicitly reference the anti-hallucination/retrieval-grounded LLM claim as part of the trust-building answer.
**Must NOT include:** repeating the full architecture — this slide should assume the judge already saw Slide 3.

### SLIDE 5 — Impact & Benefits
**Must include:**
1. Open with the ₹5.65L Cr gap / "even a 5% improvement saves thousands of crores" framing (reuse original content, verified numbers from Section 1).
2. The Current PAIMANA vs. PAIMANA-PRISM feature comparison table (reuse structure from original deck: Descriptive Reporting / Predictive Risk Scoring / Explainable AI / LLM Assistant / Stat vs ML Benchmarking / CUF-Gap Module — checks/crosses).
3. The three-persona "Delivering Value Across the Ecosystem" section (Policymakers / Implementing Agencies / Public) — keep this as supporting detail only, per Section 3.6's rule; do not let it become the main story of this slide.
4. **Close the slide by returning explicitly to the named persona from Slide 2's opening** ("Section 3.3 After" beat) — a short 1-sentence callback showing their Monday morning transformed. This is the storytelling bookend and must not be skipped.
**Must NOT include:** new technical claims not already introduced in Slide 3.

### SLIDE 6 — Research & References
**Must include:** the 5 research citations from Section 6 (A1–A5), each with: paper title, journal, one-sentence description of relevance (already written above — reuse verbatim or lightly edit), and the source link. Present as clean numbered cards, not a dense list.
**Must NOT include:** any project-based (Category B) placeholders — this slide is external validation only, real citations, nothing marked TBD.

---

**Final instruction to the content-generating model:** After producing all 6 slides' content, add one short section titled "Speaker Notes — The One Sentence To Never Forget," containing the hero narrative line from Section 3.2 verbatim, as a reminder of the through-line to repeat if the pitch ever feels like it's drifting into a feature list.

---
*Document compiled for Team Predictive Node, SIH26103, PAIMANA-PRISM, Smart India Hackathon 2026.*
