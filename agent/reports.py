"""Markdown deliverables rendered from persisted metrics, inputs and citations."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from valuation import projections, valuation_table


REPORT_PATHS = [
    "/reports/01_executive_investment_memo.md",
    "/reports/02_financial_valuation_model.md",
    "/reports/03_risk_matrix_and_red_flags.md",
]
RISK_CATEGORIES = ["Commercial", "Financial", "Operational", "Legal / regulatory", "Technical", "ESG"]


def _evidence_index(sources: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {source["id"]: source for source in sources}


def _cite(evidence_id: str | None, evidence: dict[str, dict[str, Any]]) -> str:
    if not evidence_id or evidence_id not in evidence:
        return "Evidence unavailable"
    source = evidence[evidence_id]
    title = source.get("title", "Source").replace("[", "(").replace("]", ")")
    url = source.get("url", "")
    return f"[{title}]({url}) · `{evidence_id}`" if url.startswith("https://") else f"{title} · `{evidence_id}`"


def _fmt(value: Any, suffix: str = "") -> str:
    return f"{value}{suffix}" if value is not None else "N/A"


def compile_reports(deal: dict[str, Any]) -> dict[str, str]:
    sources = deal.get("sources", [])
    evidence = _evidence_index(sources)
    metrics = {item["company"]["ticker"]: item for item in deal.get("metrics", [])}
    target = metrics.get(deal["ticker"], {})
    target_periods = target.get("periods", [])
    latest = target_periods[0] if target_periods else {}
    values = latest.get("metrics", {})
    comps = valuation_table(deal.get("metrics", []), deal.get("valuation", {}))
    scenarios = projections(values.get("revenue", {}).get("value_millions"), deal.get("valuation", {}).get("scenarios"))
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    as_of = deal["as_of"]
    name = deal["company_name"]
    ticker = deal["ticker"]
    gaps = []
    if not target_periods:
        gaps.append("No comparable complete annual financial periods were extracted from SEC company-facts data.")
    if not deal.get("valuation", {}).get("enterprise_values"):
        gaps.append("No enterprise values were supplied; valuation multiples are unavailable.")
    if not deal.get("coverage", {}).get("commercial"):
        gaps.append("Commercial research was unavailable or not independently reviewed.")
    if not deal.get("coverage", {}).get("news"):
        gaps.append("News coverage is incomplete; absence of search results is not evidence of no adverse events.")
    for metric in ("ebitda", "arr"):
        gap = target.get("unavailable_metrics", {}).get(metric)
        if gap:
            gaps.append(f"{metric.upper()} unavailable: {gap}")
    gap_md = "\n".join(f"- {gap}" for gap in gaps) if gaps else "- No automatic completeness assessment. Deal team review remains required."

    ev = deal.get("valuation", {}).get("enterprise_values", {}).get(ticker, {})
    revenue_value = values.get("revenue", {})
    revenue_cite = _cite(revenue_value.get("evidence_id"), evidence)
    thesis = deal.get("thesis", "").strip() or "No deal thesis was provided."
    memo = f"""# Executive investment memo

**{name} ({ticker})** · US public company screening  
**As of:** {as_of} · **Currency:** USD, reported financials in USD millions  
**Generated:** {generated} · **Status:** Draft—Needs Review

## Deal thesis

{thesis}

## Screening and business profile

- Legal name: {name} (`{ticker}`; CIK {deal.get('cik') or 'unavailable'}).
- SEC industry description: {deal.get('sic_description') or 'Unavailable'}.
- Latest complete reported period: {latest.get('period_end') or 'Unavailable'}.
- Historical revenue: {_fmt(revenue_value.get('value_millions'))} USD millions ({revenue_cite}).
- Three-year revenue CAGR: {_fmt(target.get('cagr', {}).get('value_percent'), '%')}; values and formula are in the valuation artifact.

## Preliminary assessment

This draft contains SEC-reported historical facts and any user-entered assumptions recorded below. The available evidence does not establish market position, customer retention, competitive moat, deal returns or investment suitability. Read source filings and resolve every open diligence request before an IC decision.

## Valuation and downside

- User-entered enterprise value: {_fmt(ev.get('value_millions'), ' USD millions')} ({ev.get('as_of') or 'date unavailable'}; {ev.get('source_note') or 'No user-entered source note'}).
- EV / revenue: {_fmt(next((row.get('ev_revenue') for row in comps if row['ticker'] == ticker), None), 'x')} using latest complete fiscal-year revenue.
- EV / EBITDA: unavailable unless normalized EBITDA is provided with evidence.
- Downside and base/upside assumptions: see the financial artifact. They are illustrative inputs, not forecasts or consensus estimates.

## Key open diligence

{gap_md}
- Review the latest 10-K Item 1A risk factors, material contracts, customer concentration, litigation and regulatory disclosures.
- Confirm accounting comparability, one-time adjustments and peer selection with the deal team.

## Decision status

**No investment recommendation is generated.** This is a sourced research draft, not a completed diligence review or an investment decision.
"""

    comp_rows = []
    for row in comps:
        comp = metrics.get(row["ticker"], {})
        period_data = comp.get("periods", [{}])
        fact = period_data[0].get("metrics", {}).get("revenue", {}) if period_data else {}
        comp_rows.append("| {ticker} · {company} | {period} | {revenue} | {growth} | {margin} | {ev} | {evrev} | {evbitda} | {cite} |".format(
            ticker=row["ticker"], company=row["company_name"], period=row.get("period_end") or "N/A",
            revenue=_fmt(row.get("revenue_millions")), growth=_fmt(row.get("revenue_growth_percent"), "%"),
            margin=_fmt(row.get("gross_margin_percent"), "%"), ev=_fmt(row.get("enterprise_value_millions")),
            evrev=_fmt(row.get("ev_revenue"), "x"), evbitda=_fmt(row.get("ev_ebitda"), "x"),
            cite=_cite(fact.get("evidence_id"), evidence),
        ))
    projection_rows = "\n".join(
        f"| {row['scenario'].title()} | {row['annual_growth_percent']}% | {row['exit_ev_revenue']}x | {row['year_1_revenue_millions']} | {row['year_2_revenue_millions']} | {row['year_3_revenue_millions']} | {row['year_3_enterprise_value_millions']} |"
        for row in scenarios
    ) or "| — | N/A | N/A | N/A | N/A | N/A | N/A |"
    financial = f"""# Financial valuation model

**{name} ({ticker})** · **As of:** {as_of} · **Generated:** {generated} · **Draft—Needs Review**  
Reported currency: USD · Display units: USD millions

## Historical annual financials and public peers

Values come from SEC company-facts observations in complete 10-K fiscal years. Concepts and filing references are linked in the evidence column. GAAP operating income is not substituted for EBITDA.

| Company | FY ended | Revenue | Revenue growth | Gross margin | User-entered EV | EV / revenue | EV / EBITDA | Revenue evidence |
|---|---:|---:|---:|---:|---:|---:|---:|---|
{chr(10).join(comp_rows) or '| No comparable filings retrieved | — | N/A | N/A | N/A | N/A | N/A | N/A | No evidence'}

## Target three-year revenue CAGR

{_fmt(target.get('cagr', {}).get('value_percent'), '%')}. Formula: latest revenue divided by the oldest of three fiscal years, raised to 1/2, minus 1. Evidence IDs: {', '.join(target.get('cagr', {}).get('evidence_ids', [])) or 'unavailable'}.

## Illustrative revenue and exit scenarios

| Scenario | Annual growth assumption | Exit EV / revenue | Year 1 revenue | Year 2 revenue | Year 3 revenue | Year 3 enterprise value |
|---|---:|---:|---:|---:|---:|---:|
{projection_rows}

All assumptions are user-entered; values are USD millions. The enterprise-value projections are not equity values, target prices or consensus forecasts.

## Method and limitations

- Revenue growth = current reported annual revenue / prior comparable fiscal-year revenue − 1.
- Gross margin = reported gross profit / reported revenue.
- Revenue values link to their SEC 10-K accession and XBRL concept.
- Enterprise value inputs are user-supplied USD millions with an explicit date and source note; no automatic price is used.
- EBITDA, ARR, P/E, precedent transactions and LBO/IRR are not calculated without compatible sourced inputs.
- Negative or zero multiple denominators are NM; missing values are N/A, never zero.

## Outstanding data requests

{gap_md}
"""

    risk_rows = []
    for category in RISK_CATEGORIES:
        risk_rows.append(f"| {category} | No risk conclusion was established from available evidence. | Unassessed | Unassessed | — | Review primary filings, contracts and specialist diligence. | Assign owner | Not available |")
    event_leads = [source for source in sources if source.get("kind") == "news" and source.get("ticker") == ticker]
    for source in event_leads[:10]:
        passage = source.get("excerpt", "")[:220].replace("|", "/")
        risk_rows.append(f"| Unclassified event lead | {passage or 'Supporting passage unavailable; inspect original source.'} | Unassessed | Unassessed | — | Verify company identity, date, procedural status, outcome and response. | Deal team review | {_cite(source['id'], evidence)} |")
    risk = f"""# Risk matrix and red flags

**{name} ({ticker})** · **As of:** {as_of} · **Generated:** {generated} · **Draft—Needs Review**

## Scoring guide

Likelihood and impact each use a 1–5 draft scale: 1 = rare / minimal, 2 = unlikely / limited, 3 = possible / material, 4 = likely / major, and 5 = near-certain / severe. A reviewer may multiply the two ratings (1–25) only after documenting support. This demo does not infer a score from a search hit. Missing verification or reviewer judgment is **Unassessed**. Candidate event leads are not established findings.

## Risk register

| Category | Risk / open question | Likelihood | Impact | Score | Mitigation / evidence request | Owner | Evidence |
|---|---|---:|---:|---:|---|---|---|
{chr(10).join(risk_rows)}

## Red-flag review

- Discovered public stories are leads only. Verify entity identity, publication date, procedural status, outcomes and company/regulator responses.
- Review the current 10-K Item 1A risk factors and all material 10-Q updates. Filing links are available in Evidence & Citations; the extraction pipeline does not claim to have reviewed every passage.
- No adverse-event search results means coverage is unknown, not that no event exists.
- Legal, regulatory, technical, ESG and accounting conclusions require appropriate human or specialist review.

## Coverage gaps

{gap_md}
"""
    return dict(zip(REPORT_PATHS, [memo, financial, risk]))

