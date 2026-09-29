"""Ask PRISM: precomputed, grounded answers (no LLM).

Every answer is generated from the exported prototype data and carries its sources.
The web app matches a question to an intent by keywords (or a project code / name)
and shows the stored answer.
"""

from __future__ import annotations

DISCLAIMER = (
    "Answers come only from the prototype dataset (PAIMANA Flash Report figures and PRISM's "
    "precomputed analysis). Ask PRISM does not generate new numbers."
)


def _cr(x: float) -> str:
    return f"₹{x:,.0f} Cr"


def _lakh_cr(x: float) -> str:
    return f"₹{x / 1e5:,.2f} lakh crore"


def project_answer(rec: dict) -> dict:
    r = rec["risk"]
    ups = [d for d in r["drivers"] if d["direction"] == "raises"]
    downs = [d for d in r["drivers"] if d["direction"] == "lowers"]
    lines = [
        f"PRISM rates {rec['name']} ({rec['code']}) at {r['score']:.1f}/10 — {r['band'].title()} risk: "
        f"a {r['probability']:.0%} estimated chance that its official completion date is pushed back in the next report."
    ]
    if ups:
        lines.append("Main reasons:")
        lines += [f"{i}. {d['text']}" for i, d in enumerate(ups, 1)]
    if downs:
        lines.append(f"Working in its favour: {downs[0]['text'].rstrip('.')}.")
    if rec["data_quality"]["verify"]:
        lines.append("Note: this project has an error-level data-quality flag; verify its figures before acting.")
    return {
        "code": rec["code"],
        "answer": "\n".join(lines),
        "sources": [
            f"{rec['source']['report']} ({rec['source']['month']}), {rec['source']['table']}, page {rec['source']['page']} — OFFICIAL figures",
            "PRISM early-warning model — MODEL ESTIMATE (precomputed)",
        ],
    }


def build(
    portfolio: dict, records: list[dict], advisor_json: dict, evidence: dict, importance: list[dict],
    hero_code: str | None = None,
) -> dict:
    off = portfolio["official"]
    der = portfolio["derived"]
    report = f"Flash Report #{portfolio['report']['number']} ({portfolio['as_of']})"
    by_score = sorted((x for x in records if not x["data_quality"]["verify"]), key=lambda x: -x["risk"]["score"])
    intents = []

    def add(iid, question, keywords, answer, items=None, sources=None, klass="DERIVED"):
        intents.append(
            {"id": iid, "question": question, "keywords": keywords, "answer": answer,
             "projects": items or [], "sources": sources or [], "class": klass}
        )

    top = by_score[:5]
    add(
        "attention",
        "Which projects need attention?",
        ["attention", "priority", "prioritise", "prioritize", "urgent", "focus", "high risk", "red", "flagged", "worst"],
        "Projects in the prototype sample that PRISM would review first:\n"
        + "\n".join(
            f"{i}. {x['name']} ({x['code']}, {x['ministry_short']}) — {x['risk']['score']:.1f}/10. "
            f"{next((d['text'] for d in x['risk']['drivers'] if d['direction'] == 'raises'), '')}"
            for i, x in enumerate(top, 1)
        )
        + f"\nAcross all {off['ongoing_projects']:,} projects, {der['risk_bands']['high']:,} are in the High band.",
        [x["code"] for x in top],
        [report + " — OFFICIAL figures", "PRISM early-warning model — MODEL ESTIMATE"],
        "MODEL ESTIMATE",
    )

    drivers = [d for d in importance if d["share"] >= 0.02][:5]
    add(
        "drivers",
        "What are the main risk drivers?",
        ["driver", "drivers", "factor", "factors", "cause", "causes", "reason", "reasons", "why projects", "what drives"],
        f"Across all {off['ongoing_projects']:,} projects, these factors move PRISM's scores most "
        "(share of total explanation weight):\n"
        + "\n".join(f"{i}. {d['label']} — {d['share']:.0%}" for i, d in enumerate(drivers, 1))
        + (f"\n{drivers[0]['label']} leads" if drivers else "")
        + ": the CUF records no cause of delay, so causes such as land acquisition or clearances "
        "cannot yet be measured directly.",
        [],
        ["PRISM driver analysis (exact per-project decomposition, averaged) — MODEL ESTIMATE"],
        "MODEL ESTIMATE",
    )

    slipped = sorted((x for x in records if (x["derived"]["delay_months"] or 0) > 0), key=lambda x: -(x["derived"]["delay_months"] or 0))[:5]
    add(
        "slippage",
        "Show projects with schedule slippage.",
        ["slippage", "slip", "delay", "delayed", "late", "behind schedule", "schedule", "overdue", "time overrun"],
        f"{der['delayed_projects']:,} of {off['ongoing_projects']:,} ongoing projects have a completion date later than "
        f"originally approved; the median delay is {der['median_delay_months']:.0f} months.\n"
        "Largest delays in the prototype sample:\n"
        + "\n".join(
            f"{i}. {x['name']} ({x['code']}) — {x['derived']['delay_months']:.0f} months behind the original target"
            for i, x in enumerate(slipped, 1)
        ),
        [x["code"] for x in slipped],
        [report + " — dates OFFICIAL; delay = revised − original completion date (DERIVED)"],
    )

    over = sorted(
        (x for x in records if x["derived"]["funding_status"] == "overspent" and not x["data_quality"]["verify"]),
        key=lambda x: -((x["official"]["expenditure_cr"] or 0) - (x["derived"]["sanctioned_cr"] or 0)),
    )[:5]
    t = advisor_json["totals"]
    add(
        "budget_pressure",
        "What projects have potential budget pressure?",
        ["budget", "pressure", "shortfall", "overspent", "overspend", "over budget", "cost overrun", "funding", "money", "cost"],
        f"{t['shortfall_projects']} projects have already spent more than their sanctioned cost — {_cr(t['shortfall_cr'])} "
        f"above sanction in total (projects with suspect figures excluded). {der['cost_revised_up_projects']:,} projects "
        "carry a revised cost above their original approval.\n"
        + ("In the prototype sample:\n" + "\n".join(
            f"{i}. {x['name']} ({x['code']}) — {_cr(x['official']['expenditure_cr'] - x['derived']['sanctioned_cr'])} above its sanctioned {_cr(x['derived']['sanctioned_cr'])}"
            for i, x in enumerate(over, 1)
        ) if over else ""),
        [x["code"] for x in over],
        [report + " — expenditure and costs OFFICIAL; gap DERIVED"],
    )

    featured = advisor_json["scenarios"][0] if advisor_json["scenarios"] else None
    add(
        "advisor",
        "What is the Reallocation Advisor?",
        ["reallocation advisor", "advisor", "reallocat", "re-appropriation", "reappropriation", "prescriptive", "move funds", "fund transfer"],
        "The Reallocation Advisor is PRISM's prescriptive step: it shows where budget headroom that already exists "
        "could help a project that needs money, inside the same ministry.\n"
        "1. Find buffers: projects whose latest revised cost is below their original approved cost (an official downward revision).\n"
        "2. Find shortfalls: projects whose cumulative expenditure is already above their sanctioned cost.\n"
        "3. Pair them only within the same ministry/department, same implementing agency first, preferring low-risk, near-complete sources.\n"
        "4. Hold back projects whose figures need verification.\n"
        f"In the latest report it finds {advisor_json['totals']['recommendations']} such pairings worth {_cr(advisor_json['totals']['matched_cr'])}"
        + (
            f"; the featured one moves up to {_cr(featured['suggested_amount_cr'])} from project {featured['source']['project_code']} "
            f"to project {featured['destination']['project_code']} ({featured['destination']['agency']})."
            if featured
            else "."
        )
        + "\nOn the Advisor page you can pick a scenario, adjust the amount and see the before/after effect and an advisory note.\n"
        + advisor_json["caveat"],
        [featured["source"]["project_code"], featured["destination"]["project_code"]] if featured else [],
        [report + " — costs and expenditure OFFICIAL; buffers and shortfalls DERIVED", "Scenarios — ILLUSTRATIVE, subject to approval"],
        "ILLUSTRATIVE",
    )
    add(
        "buffers",
        "Where is budget buffer available?",
        ["buffer", "slack", "saving", "savings", "headroom", "surplus", "under budget", "spare"],
        f"{t['buffer_projects']} projects run below their original approved cost after official downward revisions — "
        f"{_cr(t['buffer_cr'])} in total. PRISM pairs them with shortfalls inside the same ministry and finds "
        f"{t['recommendations']} possible pairings worth {_cr(t['matched_cr'])}.\n"
        + (f"Example: {featured['sentence']}\n" if featured else "")
        + advisor_json["caveat"],
        [featured["source"]["project_code"], featured["destination"]["project_code"]] if featured else [],
        [report + " — costs OFFICIAL; buffer and shortfall DERIVED", "Pairings — ILLUSTRATIVE scenario"],
        "ILLUSTRATIVE",
    )

    ev = evidence["test"]
    add(
        "reliability",
        "How reliable is the risk score?",
        ["reliable", "accuracy", "accurate", "trust", "tested", "validation", "backtest", "evidence", "proof", "auc"],
        f"PRISM was tested on a month it never saw: it scored all {ev['n']:,} projects in the {evidence['protocol']['test_month']} "
        f"report, and the next report pushed back {ev['positives']} completion dates. Of the {ev['high_flagged']} projects it placed "
        f"in the High band, {ev['high_correct']} ({ev['high_precision']:.0%}) were revised — {ev['high_recall']:.0%} of all revisions "
        f"caught one report ahead. Ranking accuracy (AUC): fused {ev['auc']['fused']:.2f}, XGBoost {ev['auc']['xgb']:.2f}, "
        f"logistic regression {ev['auc']['logit']:.2f}, simple rule of thumb {ev['auc']['rule']:.2f}.\n"
        "Limits: only five monthly public reports are available; the multi-year OCMS archive would strengthen this.",
        [],
        ["PRISM backtest on Flash Reports #486–#490 — measured, not assumed"],
        "MODEL ESTIMATE",
    )

    add(
        "method",
        "How is the risk score calculated?",
        ["how", "calculated", "method", "methodology", "score", "model", "fusion", "works", "explain"],
        "PRISM asks one question: will this project's official completion date be pushed back in the next monthly report?\n"
        "1. Two statistical models (logistic regression, Cox survival model) and one machine-learning model (XGBoost) each "
        "estimate that chance from CUF fields: dates, costs, expenditure, progress, ministry, agency and location.\n"
        "2. The three estimates are combined, weighted by how well each predicted a held-out month.\n"
        "3. Score = 10 × combined probability (0–10). Every score splits exactly into the factors behind it; the top three are shown in plain language.\n"
        "The scores are precomputed for this prototype; nothing is trained in the browser.",
        [],
        ["PRISM methodology"],
        "MODEL ESTIMATE",
    )

    ministries = sorted(portfolio["ministries"], key=lambda m: -m["high_risk"])[:5]
    add(
        "ministries",
        "Which ministries have the most high-risk projects?",
        ["ministry", "ministries", "department", "departments", "agency", "agencies", "sector"],
        "High-band projects by ministry/department (all ongoing projects):\n"
        + "\n".join(
            f"{i}. {m['label']} ({m['key']}) — {m['high_risk']} of {m['projects']} projects; {m['share_delayed']:.0%} already delayed"
            for i, m in enumerate(ministries, 1)
        ),
        [],
        [report + " — OFFICIAL figures", "Risk bands — MODEL ESTIMATE"],
        "MODEL ESTIMATE",
    )

    dq = evidence["data"]
    add(
        "data_quality",
        "What data issues did PRISM find?",
        ["data quality", "quality", "error", "errors", "issue", "issues", "anomaly", "anomalies", "verify", "inconsistent"],
        f"Every figure was cross-checked against the reports' own printed totals: {dq['reconciliation']['passed']} of "
        f"{dq['reconciliation']['checks']} checks pass. PRISM also flags implausible entries for verification without "
        f"altering them: {dq['data_quality']['error']} errors, {dq['data_quality']['warning']} warnings. Example: one bridge "
        "project reports expenditure 89 times its sanctioned cost — almost certainly an entry error.\n"
        f"Completed projects reach the report a median of {der['reporting_lag']['median_lag_months']:.1f} months after they actually finish.",
        [],
        ["PRISM reconciliation and data-quality checks on Flash Reports #486–#490"],
    )

    add(
        "about",
        "What does PRISM add to PAIMANA?",
        ["paimana", "prism", "what is", "about", "difference", "add", "adds", "purpose"],
        "PAIMANA tells you what happened: it monitors "
        f"{off['ongoing_projects']:,} central projects worth {_lakh_cr(off['revised_cost_cr'])} (revised cost). "
        "PRISM adds where to act next: a 0–10 early-warning score for every project, the reasons behind it, and "
        "same-ministry budget scenarios — recommendations only, never fund transfers.",
        [],
        [report + " — OFFICIAL totals"],
    )

    codes = {x["code"] for x in records}
    example = hero_code if hero_code in codes else (by_score[0]["code"] if by_score else None)
    return {
        "disclaimer": DISCLAIMER,
        "suggested": [i["question"] for i in intents if i["id"] in ("attention", "drivers", "slippage", "budget_pressure", "reliability")]
        + ([f"Why is project {example} high risk?"] if example else []),
        "intents": intents,
        "projects": {x["code"]: project_answer(x) for x in records},
        "project_lookup": {x["code"]: x["name"] for x in records},
        "fallback": (
            "I can answer questions about the prototype dataset: projects needing attention, why a project is at risk "
            "(give its code), risk drivers, schedule slippage, budget pressure, budget buffers, data quality and how the "
            "score works."
        ),
    }
