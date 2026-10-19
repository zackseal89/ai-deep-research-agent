"""Local, deal-scoped SQLite persistence for the guided demo."""

from __future__ import annotations

import json
import os
import sqlite3
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4


def _database_path() -> Path:
    configured = os.getenv("DILIGENCE_DATA_DIR")
    if configured:
        directory = Path(configured).expanduser()
    elif os.getenv("LOCALAPPDATA"):
        directory = Path(os.environ["LOCALAPPDATA"]) / "MnaDiligenceDemo"
    else:
        directory = Path.home() / ".local" / "share" / "MnaDiligenceDemo"
    directory.mkdir(parents=True, exist_ok=True)
    return directory / "diligence.sqlite3"


DB_PATH = _database_path()


def _connect() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH, timeout=15)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    return db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_db() -> None:
    with _connect() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS deals (
                id TEXT PRIMARY KEY, ticker TEXT NOT NULL, company_name TEXT NOT NULL,
                cik TEXT, exchange TEXT, sic_description TEXT, thesis TEXT NOT NULL DEFAULT '',
                peers_json TEXT NOT NULL DEFAULT '[]', valuation_json TEXT NOT NULL DEFAULT '{}',
                coverage_json TEXT NOT NULL DEFAULT '{}',
                as_of TEXT NOT NULL, status TEXT NOT NULL, fixture INTEGER NOT NULL DEFAULT 0,
                error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS stages (
                id INTEGER PRIMARY KEY AUTOINCREMENT, deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
                stage TEXT NOT NULL, status TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '',
                evidence_count INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
                UNIQUE(deal_id, stage)
            );
            CREATE TABLE IF NOT EXISTS sources (
                id TEXT NOT NULL, deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
                ticker TEXT, kind TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL,
                source_date TEXT, retrieved_at TEXT NOT NULL, excerpt TEXT NOT NULL DEFAULT '',
                verification TEXT NOT NULL, PRIMARY KEY(deal_id, id)
            );
            CREATE TABLE IF NOT EXISTS metrics (
                deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
                ticker TEXT NOT NULL, payload_json TEXT NOT NULL, PRIMARY KEY(deal_id,ticker)
            );
            CREATE TABLE IF NOT EXISTS artifacts (
                deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
                path TEXT NOT NULL, content TEXT NOT NULL, revision INTEGER NOT NULL,
                updated_at TEXT NOT NULL, PRIMARY KEY(deal_id,path)
            );
            CREATE TABLE IF NOT EXISTS response_cache (
                cache_key TEXT PRIMARY KEY, payload_json TEXT NOT NULL, cached_at TEXT NOT NULL
            );
        """)
        deal_columns = {row[1] for row in db.execute("PRAGMA table_info(deals)")}
        if "coverage_json" not in deal_columns:
            db.execute("ALTER TABLE deals ADD COLUMN coverage_json TEXT NOT NULL DEFAULT '{}'" )
        _seed_fixtures(db)
        stale = db.execute("SELECT id FROM deals WHERE status IN ('running','compiling')").fetchall()
        for row in stale:
            detail = "Previous run was interrupted by a service restart. Review saved progress, then restart manually."
            db.execute("UPDATE deals SET status='error',error=?,updated_at=? WHERE id=?", (detail, _now(), row["id"]))
            db.execute("UPDATE stages SET status='failed',detail=?,updated_at=? WHERE deal_id=? AND status='in_progress'", (detail, _now(), row["id"]))


def _seed_fixtures(db: sqlite3.Connection) -> None:
    existing = db.execute("SELECT 1 FROM deals WHERE fixture=1 LIMIT 1").fetchone()
    if existing:
        return
    fixtures = [
        ("AAPL", "Apple Inc.", "NASDAQ", "2025-10-01", "Fixture · Apple · as of 1 Oct 2025", ["MSFT", "DELL"]),
        ("MSFT", "Microsoft Corporation", "NASDAQ", "2024-10-31", "Fixture · Microsoft · as of 31 Oct 2024", ["ORCL", "CRM"]),
    ]
    now = _now()
    for ticker, name, exchange, as_of, title, peers in fixtures:
        deal_id = f"fixture-{ticker.lower()}"
        db.execute(
            "INSERT OR IGNORE INTO deals(id,ticker,company_name,exchange,thesis,peers_json,valuation_json,as_of,status,fixture,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,1,?,?)",
            (deal_id, ticker, name, exchange, "Illustrative saved-deal fixture. Run a fresh SEC analysis to load dated evidence.", json.dumps(peers), "{}", as_of, "fixture", now, now),
        )
        for stage in ["Screening", "Financial", "Commercial", "Risk", "Memo"]:
            db.execute("INSERT OR IGNORE INTO stages(deal_id,stage,status,detail,evidence_count,updated_at) VALUES(?,?,?,?,0,?)", (deal_id, stage, "pending", "Fixture example: no research has been run.", now))
        for path, heading, body in [
            ("/reports/01_executive_investment_memo.md", "Executive investment memo", "No research has been run for this fixture. Start a fresh analysis to retrieve public SEC evidence."),
            ("/reports/02_financial_valuation_model.md", "Financial valuation model", "No financial values are loaded. Financial figures will be sourced from SEC filings; enterprise values must be entered as dated user assumptions."),
            ("/reports/03_risk_matrix_and_red_flags.md", "Risk matrix and red flags", "Risk categories are unassessed until dated evidence is retrieved and reviewed."),
        ]:
            content = f"# {heading}\n\n**{title}**\n\n**Fixture only · Draft—Needs Review · As of {as_of}**\n\n{body}\n"
            db.execute("INSERT OR IGNORE INTO artifacts(deal_id,path,content,revision,updated_at) VALUES(?,?,?,1,?)", (deal_id, path, content, now))


def _decode(row: sqlite3.Row) -> dict[str, Any]:
    item = dict(row)
    for key, target in (("peers_json", "peers"), ("valuation_json", "valuation"), ("coverage_json", "coverage")):
        item[target] = json.loads(item.pop(key))
    item["fixture"] = bool(item["fixture"])
    return item


def _stage_rows(db: sqlite3.Connection, deal_id: str) -> list[dict[str, Any]]:
    return [dict(row) for row in db.execute("SELECT stage,status,detail,evidence_count,updated_at FROM stages WHERE deal_id=? ORDER BY id", (deal_id,))]


def create_deal(company: dict[str, Any], thesis: str, peers: list[str], valuation: dict[str, Any], as_of: date) -> str:
    deal_id, now = str(uuid4()), _now()
    with _connect() as db:
        db.execute("INSERT INTO deals(id,ticker,company_name,cik,exchange,sic_description,thesis,peers_json,valuation_json,coverage_json,as_of,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
            deal_id, company["ticker"], company["company_name"], company["cik"], company.get("exchange"), company.get("sic_description"),
            thesis, json.dumps(peers), json.dumps(valuation), "{}", as_of.isoformat(), "draft", now, now,
        ))
        for stage in ["Screening", "Financial", "Commercial", "Risk", "Memo"]:
            db.execute("INSERT INTO stages(deal_id,stage,status,detail,updated_at) VALUES(?,?,?,?,?)", (deal_id, stage, "pending", "Awaiting analysis.", now))
    return deal_id


def list_deals() -> list[dict[str, Any]]:
    with _connect() as db:
        rows = db.execute("SELECT * FROM deals ORDER BY fixture ASC, updated_at DESC").fetchall()
        results = []
        for row in rows:
            item = _decode(row)
            item["stages"] = _stage_rows(db, item["id"])
            results.append(item)
        return results


def get_deal(deal_id: str) -> dict[str, Any] | None:
    with _connect() as db:
        row = db.execute("SELECT * FROM deals WHERE id=?", (deal_id,)).fetchone()
        if row is None:
            return None
        item = _decode(row)
        item["stages"] = _stage_rows(db, deal_id)
        item["sources"] = [dict(source) for source in db.execute("SELECT * FROM sources WHERE deal_id=? ORDER BY retrieved_at DESC", (deal_id,))]
        item["metrics"] = [json.loads(metric["payload_json"]) for metric in db.execute("SELECT payload_json FROM metrics WHERE deal_id=?", (deal_id,))]
        item["artifacts"] = [dict(artifact) for artifact in db.execute("SELECT path,content,revision,updated_at FROM artifacts WHERE deal_id=? ORDER BY path", (deal_id,))]
        return item


def update_deal(deal_id: str, **fields: Any) -> None:
    allowed = {"status", "error", "valuation_json", "coverage_json", "fixture", "updated_at"}
    values = {key: value for key, value in fields.items() if key in allowed}
    values["updated_at"] = _now()
    if not values:
        return
    sets = ",".join(f"{key}=?" for key in values)
    with _connect() as db:
        db.execute(f"UPDATE deals SET {sets} WHERE id=?", (*values.values(), deal_id))


def update_stage(deal_id: str, stage: str, status: str, detail: str = "", evidence_count: int = 0) -> None:
    now = _now()
    with _connect() as db:
        db.execute("INSERT INTO stages(deal_id,stage,status,detail,evidence_count,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(deal_id,stage) DO UPDATE SET status=excluded.status,detail=excluded.detail,evidence_count=excluded.evidence_count,updated_at=excluded.updated_at", (deal_id, stage, status, detail, evidence_count, now))
        db.execute("UPDATE deals SET updated_at=? WHERE id=?", (now, deal_id))


def upsert_source(deal_id: str, source: dict[str, Any]) -> None:
    with _connect() as db:
        db.execute("INSERT INTO sources(id,deal_id,ticker,kind,title,url,source_date,retrieved_at,excerpt,verification) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(deal_id,id) DO UPDATE SET title=excluded.title,url=excluded.url,source_date=excluded.source_date,retrieved_at=excluded.retrieved_at,excerpt=excluded.excerpt,verification=excluded.verification", (
            source["id"], deal_id, source.get("ticker"), source["kind"], source["title"], source["url"], source.get("source_date"), source["retrieved_at"], source.get("excerpt", "")[:12000], source["verification"],
        ))


def upsert_metric(deal_id: str, ticker: str, payload: dict[str, Any]) -> None:
    with _connect() as db:
        db.execute("INSERT INTO metrics(deal_id,ticker,payload_json) VALUES(?,?,?) ON CONFLICT(deal_id,ticker) DO UPDATE SET payload_json=excluded.payload_json", (deal_id, ticker, json.dumps(payload)))


def upsert_artifact(deal_id: str, path: str, content: str) -> None:
    now = _now()
    with _connect() as db:
        db.execute("INSERT INTO artifacts(deal_id,path,content,revision,updated_at) VALUES(?,?,?,1,?) ON CONFLICT(deal_id,path) DO UPDATE SET content=excluded.content,revision=artifacts.revision+1,updated_at=excluded.updated_at", (deal_id, path, content, now))


def get_cache(key: str, ttl_seconds: int) -> Any | None:
    with _connect() as db:
        row = db.execute("SELECT payload_json,cached_at FROM response_cache WHERE cache_key=?", (key,)).fetchone()
        if not row:
            return None
        cached_at = datetime.fromisoformat(row["cached_at"])
        if (datetime.now(timezone.utc) - cached_at).total_seconds() > ttl_seconds:
            db.execute("DELETE FROM response_cache WHERE cache_key=?", (key,))
            return None
        return json.loads(row["payload_json"])


def set_cache(key: str, value: Any) -> None:
    with _connect() as db:
        db.execute("INSERT INTO response_cache(cache_key,payload_json,cached_at) VALUES(?,?,?) ON CONFLICT(cache_key) DO UPDATE SET payload_json=excluded.payload_json,cached_at=excluded.cached_at", (key, json.dumps(value), _now()))
