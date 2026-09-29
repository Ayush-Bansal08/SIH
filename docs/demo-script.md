# PAIMANA-PRISM — Demo script (3–5 minutes)

For the SIH 2026 prototype video / live demo. Every number below comes from the prototype
(Flash Report #490, August 2026). If you rebuild the data, re-check the numbers on screen.

## Before recording

- [ ] `cd web && npm run build`, then serve `out/` (or use the deployed URL).
- [ ] Browser window about **1440 × 900**, zoom 100%, light mode, no extensions visible.
- [ ] Open `/` fresh (so the counters animate). Close any earlier Ask PRISM conversation (reload `/ask/`).
- [ ] Keep these tabs ready in order: `/`, `/command-center/`, `/projects/618706/`, `/advisor/`, `/evidence/`, `/ask/`.

## Script

| # | Time | Screen & action | What to say |
|---|---|---|---|
| 0 | 0:00–0:20 | **Overview** — top of the page | "Every month, a MoSPI Program Director is accountable for 1,731 central projects worth ₹33.60 lakh crore. Today's reports tell her what already went wrong. PRISM tells her where to act next, why, and what options exist." |
| 1 | 0:20–0:40 | Scroll to **Meet Meera** (Before / After) | "Before: a PDF where every project looks equally urgent — 1,083 are already late. After: a ranked shortlist with reasons, and budget options." |
| 2 | 0:40–1:10 | Click **Open the Command Center** | "PRISM scored all 1,731 projects for one question: will the official completion date be pushed back in the next report? 223 are High. Two statistical models and a machine-learning model give independent opinions, fused into one 0–10 score." Point at the risk bar and the ministry chart. |
| 3 | 1:10–1:40 | In **Flagged this month**, click **Open risk profile** (618706 Bangalore–Nidagatta) | "9.3 out of 10. Statistics says 88%, machine learning 94%. Why? Its target date is next month with 1% of the work left; it is 58 months behind the original date; it has already spent ₹227.78 crore beyond its sanction. Every reason quotes the official figures — no black box." |
| 4 | 1:40–1:50 | Point at the **Reporting check** indicator | "PRISM is honest about the data too: expenditure jumped in the June report — likely a reporting catch-up, so it asks the agency to confirm." |
| 5 | 1:50–2:50 | Click **Budget scenario** → **Reallocation Advisor** | "This is what no report offers: where the money could come from. In the same agency, NHAI, project 618762 runs ₹161.94 crore below its original approved cost after an official revision." Drag the slider to about **₹80 Cr**, then press **Suggested**. "The saffron amount leaves the buffer and closes 71% of the shortfall. The delay score doesn't change — money alone doesn't move a completion date. And this is a recommendation, not execution: reallocation needs formal approval." Point at the advisory note and **Copy note**. |
| 6 | 2:50–3:30 | Click **See the evidence** | "We tested it, not assumed it. Trained on April–June, tested once on July: of 201 projects PRISM put in High, 155 — 77% — really had their date pushed back in August. XGBoost beats logistic regression; the fused score beats a rule of thumb by 0.096 AUC. And 855 of 855 figures reconcile with the reports' own totals." Scroll to **CUF vs non-CUF**: "Tunnel works are delayed 93% of the time against a 63% baseline — but contract mode, funding source and delay cause are not CUF fields. That's our recommendation to MoSPI." |
| 7 | 3:30–4:00 | Click **Ask PRISM**, then the suggestion **Why is project 618706 high risk?** | "Ask PRISM answers only from the verified data, with sources. It cannot invent a number." |
| 8 | 4:00–4:20 | Back to **Overview** (logo) | "PAIMANA tells you what happened. PRISM tells you where to act next, why — and where the money could come from. Built on the government's own data, open-source, tested." |

## If a judge asks

| Question | Answer (and where to show it) |
|---|---|
| "Is this real data?" | Yes — five official Flash Reports, 855/855 reconciliation checks, source page on every project. `/evidence/#data` |
| "How accurate is it?" | Tested on an unseen month: 155 of 201 High-band projects revised (77%); AUC 0.88 fused vs 0.79 rule of thumb. `/evidence/` |
| "Why not just XGBoost?" | It ranks slightly better (0.901); the fused score keeps two statistical opinions and exact plain-language reasons. We report both. `/evidence/#statml` |
| "Can PRISM move funds?" | No. It is a recommendation / simulation tool; reallocation needs formal approval. `/advisor/` |
| "Why do the reasons not mention land acquisition?" | The CUF records no delay cause, so it cannot be measured — only 2% of High-band projects have a published-cause proxy in their top 3. That is our case for a new CUF field. `/evidence/#drivers` |
| "What is not built yet?" | OCMS archive, live CUF feed, final-cost ranges, a local retrieval-grounded LLM, secure deployment. `/methodology/` |
