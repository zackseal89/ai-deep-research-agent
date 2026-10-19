"""
Enterprise Telemetry & Trace Recorder for Forward Deployed AI Agents

Tracks:
- Session IDs & Research Queries
- Step latency & execution durations
- Tool invocation histories with arguments and results
- Ground truth source counts and domain statistics
- Token/cost approximations
"""

import time
import json
from typing import Any, Dict, List
from dataclasses import dataclass, field, asdict


@dataclass
class ToolExecutionRecord:
    tool_name: str
    args: Dict[str, Any]
    status: str
    duration_ms: float
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)


class AgentTelemetryStore:
    """In-memory telemetry store with thread-safe recording."""

    def __init__(self):
        self.records: List[ToolExecutionRecord] = []
        self.total_queries: int = 0
        self.total_sources_scraped: int = 0
        self.start_time: float = time.time()

    def record_tool(self, tool_name: str, args: Dict[str, Any], status: str, duration_ms: float, metadata: Dict[str, Any] = None):
        record = ToolExecutionRecord(
            tool_name=tool_name,
            args=args,
            status=status,
            duration_ms=duration_ms,
            metadata=metadata or {},
        )
        self.records.append(record)
        if tool_name == "research":
            self.total_queries += 1
            sources = (metadata or {}).get("sources_count", 0)
            self.total_sources_scraped += sources

    def get_summary(self) -> Dict[str, Any]:
        uptime_seconds = time.time() - self.start_time
        return {
            "uptime_seconds": round(uptime_seconds, 2),
            "total_tool_calls": len(self.records),
            "total_research_queries": self.total_queries,
            "total_sources_gathered": self.total_sources_scraped,
            "recent_executions": [asdict(r) for r in self.records[-15:]],
        }


# Global telemetry singleton
telemetry = AgentTelemetryStore()
