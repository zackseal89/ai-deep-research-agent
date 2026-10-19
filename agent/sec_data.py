"""Small, cached SEC EDGAR client for public company diligence."""

from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import time
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
from typing import Any

import requests


class SECError(RuntimeError):
    """A missing or unavailable SEC data resource."""


class _FilingText(HTMLParser):
    """Small HTML text extractor that ignores script and style contents."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._ignored = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"script", "style", "noscript"}:
            self._ignored += 1
        elif tag.lower() in {"p", "div", "br", "tr", "td", "th", "h1", "h2", "h3", "h4"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style", "noscript"} and self._ignored:
            self._ignored -= 1
        elif tag.lower() in {"p", "div", "br", "tr", "td", "th", "h1", "h2", "h3", "h4"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self._ignored:
            self.parts.append(data)


_session = requests.Session()
_cache: dict[str, tuple[float, Any]] = {}
_cache_lock = threading.Lock()
_request_lock = threading.Lock()
_last_request = 0.0


def _headers() -> dict[str, str]:
    agent = os.getenv("SEC_USER_AGENT", "").strip()
    if not agent or "@" not in agent:
        raise SECError("Set SEC_USER_AGENT in the project .env to identify your application and a monitored contact email.")
    return {"User-Agent": agent, "Accept-Encoding": "gzip, deflate", "Accept": "application/json"}


def _get_json(url: str, ttl_seconds: int = 21_600) -> dict[str, Any]:
    global _last_request
    if not url.startswith(("https://data.sec.gov/", "https://www.sec.gov/")):
        raise SECError("SEC requests must use an official SEC host.")
    headers = _headers()
    now = time.monotonic()
    with _cache_lock:
        cached = _cache.get(url)
        if cached and now - cached[0] < ttl_seconds:
            return cached[1]

    # Stay well below the SEC fair-access ceiling even when a user chooses peers.
    with _request_lock:
        delay = 0.13 - (time.monotonic() - _last_request)
        if delay > 0:
            time.sleep(delay)
        response = None
        for attempt in range(3):
            try:
                response = _session.get(url, headers=headers, timeout=(4, 18), stream=True)
                _last_request = time.monotonic()
            except requests.RequestException as exc:
                if attempt == 2:
                    raise SECError(f"SEC request failed: {exc.__class__.__name__}.") from exc
                time.sleep(0.25 * (attempt + 1))
                continue
            if not response.url.startswith(("https://data.sec.gov/", "https://www.sec.gov/")):
                response.close()
                raise SECError("SEC redirected a request outside official SEC hosts.")
            if response.status_code == 429 or response.status_code >= 500:
                response.close()
                if attempt == 2:
                    raise SECError(f"SEC returned HTTP {response.status_code} after retries.")
                time.sleep(0.5 * (attempt + 1))
                continue
            if response.status_code != 200:
                response.close()
                raise SECError(f"SEC returned HTTP {response.status_code}.")
            try:
                declared_length = response.headers.get("Content-Length")
                if declared_length:
                    try:
                        if int(declared_length) > 32_000_000:
                            raise SECError("SEC response exceeded the 32 MB safety limit.")
                    except ValueError as exc:
                        raise SECError("SEC returned an invalid content length.") from exc
                body = bytearray()
                for chunk in response.iter_content(chunk_size=64 * 1024):
                    body.extend(chunk)
                    if len(body) > 32_000_000:
                        raise SECError("SEC response exceeded the 32 MB safety limit.")
                result = json.loads(body)
            except (ValueError, TypeError) as exc:
                raise SECError("SEC returned malformed JSON.") from exc
            finally:
                response.close()
            with _cache_lock:
                _cache[url] = (time.monotonic(), result)
            return result
    raise SECError("SEC data is temporarily unavailable.")


def _ticker_map() -> list[dict[str, Any]]:
    result = _get_json("https://www.sec.gov/files/company_tickers_exchange.json")
    rows = result.get("data", [])
    fields = result.get("fields", [])
    if fields and rows:
        return [dict(zip(fields, row)) for row in rows]
    return _get_json("https://www.sec.gov/files/company_tickers.json").values()


def resolve_company(ticker_or_name: str) -> dict[str, Any]:
    query = ticker_or_name.strip()
    if not query or len(query) > 120:
        raise SECError("Enter a company ticker or name.")
    rows = list(_ticker_map())
    ticker_matches = [r for r in rows if str(r.get("ticker", "")).upper() == query.upper()]
    if ticker_matches:
        matches = ticker_matches
    else:
        normalized = " ".join(query.casefold().split())
        matches = [r for r in rows if " ".join(str(r.get("name", "")).casefold().split()) == normalized]
    unique = {(str(r.get("cik", "")), str(r.get("name", ""))): r for r in matches}
    matches = list(unique.values())
    if len(matches) != 1:
        if len(matches) > 1:
            choices = ", ".join(f"{r.get('name')} ({r.get('ticker')})" for r in matches[:5])
            raise SECError(f"Company name is ambiguous. Choose a ticker: {choices}.")
        raise SECError(f"No US SEC filer matched '{query}'. Check the ticker or company name.")
    row = matches[0]
    return {
        "ticker": str(row.get("ticker", "")).upper(),
        "company_name": str(row.get("name", "")),
        "cik": str(row.get("cik", "")).zfill(10),
        "exchange": row.get("exchange"),
    }


def _submission_filings(company: dict[str, Any], as_of: date) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    submission = _get_json(f"https://data.sec.gov/submissions/CIK{company['cik']}.json")
    recent = submission.get("filings", {}).get("recent", {})
    filings = []
    for index, form in enumerate(recent.get("form", [])):
        if form not in {"10-K", "10-K/A", "10-Q", "10-Q/A"}:
            continue
        filed = recent.get("filingDate", [])[index]
        if filed > as_of.isoformat():
            continue
        accession = recent.get("accessionNumber", [])[index]
        primary = recent.get("primaryDocument", [])[index]
        accession_path = accession.replace("-", "")
        cik_int = str(int(company["cik"]))
        filings.append({
            "form": form,
            "filed_at": filed,
            "period_end": recent.get("reportDate", [""] * (index + 1))[index] or None,
            "accession": accession,
            "url": f"https://www.sec.gov/Archives/edgar/data/{cik_int}/{accession_path}/{primary}",
            "source_id": hashlib.sha256(f"{company['cik']}:{accession}".encode()).hexdigest()[:20],
        })
        if len(filings) == 12:
            break
    company_info = {**company, "sic": submission.get("sic"), "sic_description": submission.get("sicDescription"), "fiscal_year_end": submission.get("fiscalYearEnd")}
    return company_info, filings


def _risk_factors_excerpt(url: str) -> tuple[str | None, str]:
    global _last_request
    if not url.startswith("https://www.sec.gov/Archives/edgar/data/"):
        raise SECError("Filing passages must come from an official SEC archive URL.")
    cache_key = "filing-text:" + url
    with _cache_lock:
        cached = _cache.get(cache_key)
        if cached and time.monotonic() - cached[0] < 86_400:
            return cached[1]
    headers = _headers()
    with _request_lock:
        delay = 0.13 - (time.monotonic() - _last_request)
        if delay > 0:
            time.sleep(delay)
        try:
            response = _session.get(url, headers=headers, timeout=(4, 18), stream=True)
        except requests.RequestException as exc:
            raise SECError(f"SEC filing request failed: {exc.__class__.__name__}.") from exc
        _last_request = time.monotonic()
        try:
            if not response.url.startswith("https://www.sec.gov/Archives/edgar/data/"):
                return None, "filing_redirected_outside_sec_archive"
            if response.status_code != 200:
                return None, f"filing_http_{response.status_code}"
            length = response.headers.get("Content-Length")
            if length:
                try:
                    if int(length) > 8_000_000:
                        return None, "filing_exceeds_8_mb_limit"
                except ValueError:
                    return None, "filing_invalid_content_length"
            body = bytearray()
            for chunk in response.iter_content(chunk_size=64 * 1024):
                body.extend(chunk)
                if len(body) > 8_000_000:
                    return None, "filing_exceeds_8_mb_limit"
        finally:
            response.close()
    parser = _FilingText()
    try:
        parser.feed(bytes(body).decode(response.encoding or "utf-8", errors="replace"))
    except Exception:
        return None, "filing_html_parse_failed"
    text = re.sub(r"[ \t\xa0]+", " ", " ".join(parser.parts))
    text = re.sub(r"\n\s*\n+", "\n", text)
    headings = list(re.finditer(r"\bitem\s+1a\s*[.:\-–]?\s*risk\s+factors\b", text, re.I))
    if not headings:
        return None, "item_1a_risk_factors_not_found"
    start = headings[-1].end()
    end = re.search(r"\bitem\s+(?:1b|2)\s*[.:\-–]", text[start:], re.I)
    section = text[start:start + end.start()] if end else text[start:start + 16_000]
    section = re.sub(r"\s+", " ", section).strip()
    if len(section) < 250:
        result = (None, "item_1a_section_too_short_to_verify")
    else:
        result = (section[:8_000], "item_1a_passage_retrieved")
    with _cache_lock:
        _cache[cache_key] = (time.monotonic(), result)
    return result


def company_filings(ticker_or_name: str, as_of: date | None = None, form: str | None = None, include_risk_factors: bool = False) -> dict[str, Any]:
    as_of = as_of or date.today()
    company = resolve_company(ticker_or_name)
    info, filings = _submission_filings(company, as_of)
    if form:
        filings = [f for f in filings if f["form"].removesuffix("/A") == form]
    if include_risk_factors:
        chosen: set[str] = set()
        for filing in filings:
            base_form = filing["form"].removesuffix("/A")
            if base_form not in {"10-K", "10-Q"} or base_form in chosen:
                continue
            chosen.add(base_form)
            try:
                excerpt, status = _risk_factors_excerpt(filing["url"])
            except SECError:
                excerpt, status = None, "passage_retrieval_failed"
            filing["risk_factors_excerpt"] = excerpt
            filing["risk_factors_anchor"] = "Item 1A · Risk Factors"
            filing["risk_factors_status"] = status
            if len(chosen) == 2:
                break
    return {"company": info, "filings": filings}


_METRIC_TAGS = {
    "revenue": ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"],
    "gross_profit": ["GrossProfit"],
    "operating_income": ["OperatingIncomeLoss"],
    "net_income": ["NetIncomeLoss", "ProfitLoss"],
}


def _annual_observations(facts: dict[str, Any], concept: str, as_of: date) -> list[dict[str, Any]]:
    candidates = []
    for tag in _METRIC_TAGS[concept]:
        tagged = facts.get("us-gaap", {}).get(tag, {})
        for unit, entries in tagged.get("units", {}).items():
            if unit != "USD":
                continue
            for entry in entries:
                if entry.get("form") not in {"10-K", "10-K/A"} or entry.get("fp") != "FY":
                    continue
                filed = entry.get("filed", "")
                if filed > as_of.isoformat():
                    continue
                end = entry.get("end", "")
                start = entry.get("start")
                if not end or not start:
                    continue
                duration_days = (date.fromisoformat(end) - date.fromisoformat(start)).days
                if not 330 <= duration_days <= 400:
                    continue
                accession = entry.get("accn", "")
                candidates.append({
                    "tag": tag, "value_millions": str(Decimal(str(entry["val"])) / Decimal(1_000_000)),
                    "period_start": start, "period_end": end, "filed_at": filed,
                    "fiscal_year": entry.get("fy"), "accession": accession,
                    "evidence_id": hashlib.sha256(f"{accession}:{tag}".encode()).hexdigest()[:20],
                    "url": f"https://www.sec.gov/Archives/edgar/data/{str(int(facts['cik']))}/{accession.replace('-', '')}/{facts.get('_documents', {}).get(accession, '')}" if facts.get("_documents", {}).get(accession) else None,
                })
        if candidates:
            break
    # Keep the latest filed fact for each fiscal year end (respecting the as-of date).
    latest_by_end: dict[str, dict[str, Any]] = {}
    for item in candidates:
        old = latest_by_end.get(item["period_end"])
        if old is None or item["filed_at"] > old["filed_at"]:
            latest_by_end[item["period_end"]] = item
    return sorted(latest_by_end.values(), key=lambda item: item["period_end"], reverse=True)[:3]


def annual_metrics(ticker_or_name: str, as_of: date | None = None) -> dict[str, Any]:
    as_of = as_of or date.today()
    company = resolve_company(ticker_or_name)
    raw_facts = _get_json(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{company['cik']}.json")
    raw_facts["cik"] = company["cik"]
    submissions = _get_json(f"https://data.sec.gov/submissions/CIK{company['cik']}.json")
    recent = submissions.get("filings", {}).get("recent", {})
    for index, accession in enumerate(recent.get("accessionNumber", [])):
        raw_facts.setdefault("_documents", {})[accession] = recent.get("primaryDocument", [""] * (index + 1))[index]

    values: dict[str, list[dict[str, Any]]] = {}
    for metric in _METRIC_TAGS:
        values[metric] = _annual_observations(raw_facts, metric, as_of)

    filings = {item["accession"]: item for item in _submission_filings(company, as_of)[1]}
    periods: dict[str, dict[str, Any]] = {}
    for metric, observations in values.items():
        for observation in observations:
            period = periods.setdefault(observation["period_end"], {
                "period_start": observation["period_start"], "period_end": observation["period_end"],
                "fiscal_year": observation["fiscal_year"], "metrics": {},
            })
            filing = filings.get(observation["accession"], {})
            evidence_id = observation["evidence_id"]
            period["metrics"][metric] = {
                "value_millions": observation["value_millions"], "unit": "USD millions",
                "concept": f"us-gaap:{observation['tag']}", "accession": observation["accession"],
                "filed_at": observation["filed_at"], "evidence_id": evidence_id,
                "url": filing.get("url"),
            }
    annual = sorted(periods.values(), key=lambda item: item["period_end"], reverse=True)[:3]
    for index, period in enumerate(annual):
        revenue = period["metrics"].get("revenue")
        if revenue:
            revenue_value = Decimal(revenue["value_millions"])
            period["metrics"]["gross_margin"] = None
            gross_profit = period["metrics"].get("gross_profit")
            if gross_profit and revenue_value > 0:
                period["metrics"]["gross_margin"] = {
                    "value_percent": str(Decimal(gross_profit["value_millions"]) / revenue_value * Decimal(100)),
                    "formula": "gross_profit / revenue * 100", "evidence_ids": [gross_profit["evidence_id"], revenue["evidence_id"]],
                }
            if index + 1 < len(annual):
                prior = annual[index + 1]["metrics"].get("revenue")
                day_gap = (date.fromisoformat(period["period_end"]) - date.fromisoformat(annual[index + 1]["period_end"])).days
                if prior and 330 <= day_gap <= 400 and Decimal(prior["value_millions"]) > 0:
                    period["metrics"]["revenue_growth"] = {
                        "value_percent": str((revenue_value / Decimal(prior["value_millions"]) - Decimal(1)) * Decimal(100)),
                        "formula": "current_revenue / prior_revenue - 1", "evidence_ids": [revenue["evidence_id"], prior["evidence_id"]],
                    }
    cagr = None
    if len(annual) >= 3:
        newest = annual[0]["metrics"].get("revenue")
        oldest = annual[2]["metrics"].get("revenue")
        elapsed_days = (date.fromisoformat(annual[0]["period_end"]) - date.fromisoformat(annual[2]["period_end"])).days
        if newest and oldest and 660 <= elapsed_days <= 800 and Decimal(oldest["value_millions"]) > 0 and Decimal(newest["value_millions"]) > 0:
            ratio = Decimal(newest["value_millions"]) / Decimal(oldest["value_millions"])
            try:
                elapsed_years = Decimal(elapsed_days) / Decimal("365.2425")
                cagr_value = (ratio.ln() / elapsed_years).exp() - Decimal(1)
                cagr = {"value_percent": str(cagr_value * Decimal(100)), "elapsed_years": str(elapsed_years), "formula": "(latest_revenue / oldest_revenue) ** (365.2425 / elapsed_days) - 1", "evidence_ids": [newest["evidence_id"], oldest["evidence_id"]]}
            except (InvalidOperation, ValueError):
                cagr = None
    return {
        "company": company,
        "periods": annual,
        "cagr": cagr,
        "unavailable_metrics": {"ebitda": "No normalized EBITDA fact is assumed from SEC companyfacts.", "arr": "ARR requires a source-specific recurring-revenue disclosure."},
    }
