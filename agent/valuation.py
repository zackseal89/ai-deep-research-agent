"""Deterministic financial and projection calculations used by the UI and reports."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any


def _decimal(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        result = Decimal(str(value))
        return result if result.is_finite() else None
    except (InvalidOperation, ValueError):
        return None


def _display(value: Decimal | None, places: str = "0.01") -> str | None:
    return str(value.quantize(Decimal(places), rounding=ROUND_HALF_UP)) if value is not None else None


def valuation_table(metrics_by_ticker: list[dict[str, Any]], inputs: dict[str, Any]) -> list[dict[str, Any]]:
    enterprise_values = inputs.get("enterprise_values", {})
    rows = []
    for company in metrics_by_ticker:
        ticker = company["company"]["ticker"]
        latest = company.get("periods", [{}])[0] if company.get("periods") else {}
        metric_values = latest.get("metrics", {})
        revenue = _decimal(metric_values.get("revenue", {}).get("value_millions"))
        ebitda = _decimal(metric_values.get("ebitda", {}).get("value_millions"))
        ev_entry = enterprise_values.get(ticker, {})
        ev = _decimal(ev_entry.get("value_millions"))
        ev_revenue = (ev / revenue) if ev is not None and revenue is not None and revenue > 0 else None
        ev_ebitda = (ev / ebitda) if ev is not None and ebitda is not None and ebitda > 0 else None
        rows.append({
            "ticker": ticker,
            "company_name": company["company"]["company_name"],
            "period_end": latest.get("period_end"),
            "revenue_millions": _display(revenue, "0.001"),
            "gross_margin_percent": _display(_decimal(metric_values.get("gross_margin", {}).get("value_percent")) if metric_values.get("gross_margin") else None),
            "revenue_growth_percent": _display(_decimal(metric_values.get("revenue_growth", {}).get("value_percent")) if metric_values.get("revenue_growth") else None),
            "cagr_percent": _display(_decimal(company.get("cagr", {}).get("value_percent")) if company.get("cagr") else None),
            "enterprise_value_millions": _display(ev, "0.001"),
            "enterprise_value_source": ev_entry.get("source_note"),
            "ev_revenue": _display(ev_revenue, "0.01"),
            "ev_revenue_status": "N/A: no comparable revenue" if revenue is None else ("NM: revenue denominator must be positive" if revenue <= 0 else "available"),
            "ev_ebitda": _display(ev_ebitda, "0.01"),
            "ev_ebitda_status": "N/A: no reported/normalized EBITDA fact" if ebitda is None else ("NM: denominator must be positive" if ebitda <= 0 else "available"),
            "revenue_evidence_id": metric_values.get("revenue", {}).get("evidence_id"),
            "gross_margin_evidence_ids": metric_values.get("gross_margin", {}).get("evidence_ids", []) if metric_values.get("gross_margin") else [],
            "growth_evidence_ids": metric_values.get("revenue_growth", {}).get("evidence_ids", []) if metric_values.get("revenue_growth") else [],
            "cagr_evidence_ids": company.get("cagr", {}).get("evidence_ids", []) if company.get("cagr") else [],
        })
    return rows


def projections(latest_revenue_millions: Any, scenarios: dict[str, Any] | None) -> list[dict[str, Any]]:
    revenue = _decimal(latest_revenue_millions)
    if revenue is None or revenue <= 0 or not scenarios:
        return []
    projections_out = []
    for name in ("downside", "base", "upside"):
        scenario = scenarios.get(name)
        if not scenario:
            continue
        growth = _decimal(scenario.get("annual_growth_percent"))
        multiple = _decimal(scenario.get("exit_ev_revenue"))
        if growth is None or multiple is None or growth <= -100 or multiple <= 0:
            continue
        year_three = revenue * ((Decimal(1) + growth / Decimal(100)) ** 3)
        projections_out.append({
            "scenario": name,
            "annual_growth_percent": _display(growth),
            "exit_ev_revenue": _display(multiple, "0.01"),
            "year_1_revenue_millions": _display(revenue * (Decimal(1) + growth / Decimal(100)), "0.001"),
            "year_2_revenue_millions": _display(revenue * (Decimal(1) + growth / Decimal(100)) ** 2, "0.001"),
            "year_3_revenue_millions": _display(year_three, "0.001"),
            "year_3_enterprise_value_millions": _display(year_three * multiple, "0.001"),
            "formula": "latest reported annual revenue × (1 + annual growth)³ × exit EV/revenue",
            "status": "illustrative assumption, not consensus or a target price",
        })
    return projections_out

