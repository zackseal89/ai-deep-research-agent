"""Public-evidence diligence workflow for the local guided demo."""

from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import date, datetime, timezone
from typing import Any

import requests

import deal_store
from reports import compile_reports
from sec_data import SECError, annual_metrics, company_filings


STAGES = ["Screening", "Financial", "Commercial", "Risk", "Memo"]


def _source_id(url: str, title: str) -> str:
    return hashlib.sha256(f"{url}\n{title}".encode()).hexdigest()[:20]


def _public_research(deal_id: str, query: str, ticker: str, kind: str) -> dict[str, Any]:
    key = os.getenv("TAVILY_API_KEY", "").strip()
    if not key:
        return {"status": "unavailable", "sources": [], "detail": "TAVILY_API_KEY is not configured; public commercial/news coverage is incomplete."}
    cache_key = hashlib.sha256(f"tavily-v1:{kind}:{query}".encode()).hexdigest()
    cached = deal_store.get_cache(cache_key, ttl_seconds=3_600)
    if cached is not None:
        collected = cached
        for source in collected:
            deal_store.upsert_source(deal_id, source)
        return {"status": "partial" if collected else "unavailable", "sources": collected,
                "detail": "Cached public-source leads require identity, date and claim review." if collected else "No usable source text was retrieved; coverage is unknown."}
    try:
        response = requests.post(
            "https://api.tavily.com/search",
            json={"api_key": key, "query": query, "topic": "news" if kind == "news" else "general", "search_depth": "advanced", "max_results": 5, "include_raw_content": True, "include_answer": False},
            timeout=(4, 20),
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        return {"status": "unavailable", "sources": [], "detail": f"Tavily retrieval failed ({exc.__class__.__name__}); coverage is incomplete."}
    collected = []
    for result in payload.get("results", [])[:5]:
        url = result.get("url", "")
        if not url.startswith("https://") or len(url) > 2048:
            continue
        raw = result.get("raw_content") or result.get("content") or ""
        # Tavily returns source-extracted text. Retain its provenance as unreviewed.
        excerpt = re.sub(r"\s+", " ", raw).strip()[:10000]
        source = {
            "id": _source_id(url, result.get("title", "")), "ticker": ticker, "kind": kind,
            "title": (result.get("title") or url)[:300], "url": url,
            "source_date": result.get("published_date"), "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "excerpt": excerpt,
            "verification": "retrieved_pending_human_review" if result.get("raw_content") else "search_snippet_discovery_only",
        }
        deal_store.upsert_source(deal_id, source)
        collected.append(source)
    deal_store.set_cache(cache_key, collected)
    return {"status": "partial" if collected else "unavailable", "sources": collected,
            "detail": "Retrieved public sources are evidence leads and require identity, date and claim review." if collected else "No usable source text was retrieved; coverage is unknown."}


def _add_filings(deal_id: str, ticker: str, filings: list[dict[str, Any]]) -> None:
    for filing in filings:
        passage = filing.get("risk_factors_excerpt")
        deal_store.upsert_source(deal_id, {
            "id": filing["source_id"], "ticker": ticker, "kind": "regulatory",
            "title": f"{filing['form']} · filed {filing['filed_at']} · period {filing.get('period_end') or 'not stated'}" + (" · Item 1A Risk Factors" if passage else ""),
            "url": filing["url"], "source_date": filing["filed_at"],
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "excerpt": passage or f"SEC filing {filing['form']}, accession {filing['accession']}. Risk-factor passage unavailable ({filing.get('risk_factors_status', 'not_requested')}); review the original filing.",
            "verification": "official_filing_item_1a_passage_retrieved" if passage else "official_filing_link_not_passage_reviewed",
        })


def _run_analysis(deal_id: str) -> None:
    deal = deal_store.get_deal(deal_id)
    if not deal:
        return
    deal_store.update_deal(deal_id, status="running", error=None, fixture=0, coverage_json="{}")
    as_of = date.fromisoformat(deal["as_of"])
    coverage = {"sec": False, "commercial": False, "news": False}
    try:
        deal_store.update_stage(deal_id, "Screening", "in_progress", "Resolving SEC filer and retrieving recent 10-K / 10-Q filing metadata.")
        result = company_filings(deal["ticker"], as_of=as_of, include_risk_factors=True)
        company = result["company"]
        _add_filings(deal_id, deal["ticker"], result["filings"])
        coverage["sec"] = True
        deal_store.update_stage(deal_id, "Screening", "completed", f"Resolved {company['company_name']}; {len(result['filings'])} filing links retrieved.", len(result["filings"]))
    except SECError as exc:
        deal_store.update_stage(deal_id, "Screening", "partial", str(exc))
        deal_store.update_deal(deal_id, status="error", error=str(exc), coverage_json="{}")
        return

    deal_store.update_stage(deal_id, "Financial", "in_progress", "Retrieving annual company facts and cited 10-K data.")
    metric_records: list[dict[str, Any]] = []
    warnings = []
    requested_tickers = list(dict.fromkeys([deal["ticker"], *deal["peers"][:3]]))
    for ticker in requested_tickers:
        try:
            facts = annual_metrics(ticker, as_of=as_of)
            filings = result["filings"] if ticker == deal["ticker"] else company_filings(ticker, as_of=as_of)["filings"]
            _add_filings(deal_id, ticker, filings)
            filing_by_accession = {filing["accession"]: filing for filing in filings}
            for period in facts["periods"]:
                for metric_name, metric in period["metrics"].items():
                    if not isinstance(metric, dict) or not metric.get("evidence_id"):
                        continue
                    filing = filing_by_accession.get(metric.get("accession"), {})
                    if not filing.get("url"):
                        continue
                    deal_store.upsert_source(deal_id, {
                        "id": metric["evidence_id"], "ticker": ticker, "kind": "regulatory",
                        "title": f"{metric.get('concept', metric_name)} · {period['period_end']} · SEC {metric.get('accession')}",
                        "url": filing["url"], "source_date": metric.get("filed_at"),
                        "retrieved_at": datetime.now(timezone.utc).isoformat(),
                        "excerpt": f"SEC company-facts observation: {metric.get('concept', metric_name)} = {metric.get('value_millions')} USD millions for {period['period_start']} to {period['period_end']}; accession {metric.get('accession')}. Review the linked original filing.",
                        "verification": "official_xbrl_fact_linked_to_filing",
                    })
            deal_store.upsert_metric(deal_id, ticker, facts)
            metric_records.append(facts)
        except SECError as exc:
            warnings.append(f"{ticker}: {exc}")
    target_facts = next((item for item in metric_records if item["company"]["ticker"] == deal["ticker"]), None)
    coverage["sec"] = bool(target_facts and target_facts.get("periods"))
    financial_detail = f"Retrieved {len(target_facts.get('periods', [])) if target_facts else 0} complete annual periods for the target and {max(0, len(metric_records)-1)} peers." if target_facts else "No compatible annual financial facts were retrieved."
    if warnings:
        financial_detail += " " + " ".join(warnings)
    deal_store.update_stage(deal_id, "Financial", "completed" if coverage["sec"] else "partial", financial_detail, sum(len(company.get("periods", [])) for company in metric_records))

    deal_store.update_stage(deal_id, "Commercial", "in_progress", "Checking public-source discovery coverage; all discovered material requires review.")
    commercial = _public_research(
        deal_id,
        f"{company['company_name']} {company.get('sic_description') or ''} competitive position pricing market share customers competitors",
        deal["ticker"], "commercial",
    )
    coverage["commercial"] = bool(commercial["sources"])
    deal_store.update_stage(deal_id, "Commercial", "partial", commercial["detail"], len(commercial["sources"]))

    deal_store.update_stage(deal_id, "Risk", "in_progress", "Checking dated public-source event leads; negative search results do not establish absence.")
    news = _public_research(
        deal_id,
        f"{company['company_name']} regulatory investigation litigation lawsuit enforcement executive departure",
        deal["ticker"], "news",
    )
    coverage["news"] = bool(news["sources"])
    deal_store.update_stage(deal_id, "Risk", "partial", news["detail"], len(news["sources"]))

    deal_store.update_stage(deal_id, "Memo", "in_progress", "Compiling the three draft artifacts from SEC facts, user assumptions and source inventory.")
    deal_store.update_deal(deal_id, status="compiling", coverage_json=json.dumps(coverage))
    current = deal_store.get_deal(deal_id)
    current["coverage"] = coverage
    artifacts = compile_reports(current)
    for path, content in artifacts.items():
        deal_store.upsert_artifact(deal_id, path, content)
    partial = not all(coverage.values()) or not target_facts or bool(warnings)
    deal_store.update_stage(deal_id, "Memo", "completed", "Three draft artifacts were saved. Evidence and assumptions still require human review.", len(current["sources"]))
    deal_store.update_deal(deal_id, status="partial" if partial else "completed", error=None, coverage_json=json.dumps(coverage))


def run_analysis(deal_id: str) -> None:
    """Run a saved analysis and persist a terminal error instead of a stuck spinner."""
    try:
        _run_analysis(deal_id)
    except Exception as exc:
        deal = deal_store.get_deal(deal_id)
        if not deal:
            return
        detail = f"Analysis stopped unexpectedly ({exc.__class__.__name__}). Review service logs, then restart the saved deal."
        for stage in deal.get("stages", []):
            if stage["status"] == "in_progress":
                deal_store.update_stage(deal_id, stage["stage"], "failed", detail, stage["evidence_count"])
        deal_store.update_deal(deal_id, status="error", error=detail)


def update_valuation(deal_id: str, valuation: dict[str, Any]) -> dict[str, str]:
    deal_store.update_deal(deal_id, valuation_json=json.dumps(valuation))
    deal = deal_store.get_deal(deal_id)
    if not deal or not deal["metrics"]:
        return {}
    if deal["status"] == "running" or deal["status"] == "compiling":
        return {}
    for path, content in compile_reports(deal).items():
        deal_store.upsert_artifact(deal_id, path, content)
    return {artifact["path"]: artifact["content"] for artifact in deal_store.get_deal(deal_id)["artifacts"]}

