# Autonomous Deep Research Agent — Generative UI & Multi-Agent Architecture

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Python 3.12+](https://img.shields.io/badge/Python-3.12+-blue?style=flat-square&logo=python)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-StateGraph-orange?style=flat-square)](https://langchain-ai.github.io/langgraph/)
[![CopilotKit](https://img.shields.io/badge/CopilotKit-AG--UI-purple?style=flat-square)](https://copilotkit.ai/)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://docker.com/)

> **Engineered by Zachary Ongeri — AI Forward Deployed Engineer (FDE)**  
> *Production-grade autonomous research platform featuring multi-model routing, thread-isolated subagents, resilient web extraction, and real-time Generative UI sidecar workspace.*

---

## 1. Overview & System Concept

Modern enterprise knowledge work suffers from two structural failure modes:
1. **Model Hallucination:** Asking an LLM to answer complex domain questions without verifiable ground truth results in confident fabrication.
2. **The "Black Box Chat" Anti-Pattern:** Traditional AI chat interfaces collapse multi-step research into a single wall of text, hiding the retrieval plan, intermediate evidence, and citations.

The **Autonomous Deep Research Agent** solves this through a **Generative UI + Virtual Filesystem sidecar architecture**. As the agent reasons, it plans actionable goals, deploys web-scouring subagents, generates verified filesystem artifacts (`/reports/dossier.md`), and projects every tool call as an interactive card in a live workspace.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 16 CLIENT (APP ROUTER)                  │
│                                                                        │
│   ┌───────────────────────────────┐  ┌─────────────────────────────┐   │
│   │    CopilotChat (Left 38%)     │  │   Live Workspace (Right 62%) │   │
│   │                               │  │                             │   │
│   │  • User Inquiry               │  │  • Autonomous Plan (Todos)  │   │
│   │  • Generative Tool Cards      │  │  • Virtual Filesystem (.md) │   │
│   │  • Executive Synthesis        │  │  • Verified Grounded Sources│   │
│   │  • Suggested Domain Chips     │  │  • One-Click Export Dossier │   │
│   └───────────────▲───────────────┘  └──────────────▲──────────────┘   │
└───────────────────┼─────────────────────────────────┼──────────────────┘
                    │  CopilotKit Runtime (HTTP / SSE)│ State Mirroring
                    ▼                                 │
┌─────────────────────────────────────────────────────┼──────────────────┐
│                   FASTAPI BACKEND (AG-UI PROTOCOL)  │                  │
│                                                     │                  │
│   ┌─────────────────────────────────────────────────┴──────────────┐   │
│   │             LangGraph AG-UI Coordinator Agent                  │   │
│   │                                                                │   │
│   │   [write_todos]  ───> In-Memory Research Plan Roadmap          │   │
│   │   [write_file]   ───> Virtual Filesystem (/reports/*.md)       │   │
│   │   [read_file]    ───> Cross-Referencing Knowledge Retrieval    │   │
│   │   [research]     ───> Dispatches Thread-Isolated Subagent      │   │
│   └─────────────────────────────────┬──────────────────────────────┘   │
│                                     │                                  │
│                   ┌─────────────────▼──────────────────┐               │
│                   │ Thread-Isolated Research Subagent  │               │
│                   │ (No Callback Leakage to Frontend)  │               │
│                   └─────────────────┬──────────────────┘               │
│                                     │                                  │
│             ┌───────────────────────┴────────────────────────┐         │
│             ▼                                                ▼         │
│   Primary Engine: Tavily API               Fallback: Direct Web Extract │
│   (Full-page contextual scrape)            (HTML parsing & ground truth)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Forward Deployed Engineering (FDE) Invariants

### 2.1 OS-Level Thread Isolation (Preventing Callback Bleed)
In hierarchical multi-agent architectures using LangChain/LangGraph, subagent internal reasoning tokens often leak into parent streaming callbacks, creating JSON clutter on the frontend.  
**Solution:** The coordinator spawns the research subagent inside a dedicated Python `ThreadPoolExecutor(max_workers=1)`. This completely severs callback propagation at the OS thread boundary, guaranteeing that only synthesized prose and structured citations are returned to the user.

### 2.2 Client-Side State Mirroring (`useDefaultTool`)
Deep Agents manage filesystem nodes as Python dictionaries. Standard `useCoAgent` hooks fail across Python `Dict` ↔ TypeScript `Array` serialization boundaries.  
**Solution:** We implement `useDefaultTool` with deterministic deduplication hashes to mirror the agent's virtual filesystem and task list directly into local React state with zero hydration errors.

### 2.3 Multi-Model Vendor Independence (Provider Factory)
Enterprise deployments rarely tolerate single-vendor API lock-in. The backend features a dynamic LLM Factory supporting:
- **Google Gemini** (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-pro`)
- **Anthropic Claude** (`claude-3-5-sonnet`, `claude-3-7-sonnet`)
- **OpenAI** (`gpt-4o`, `gpt-5.5`, `gpt-4o-mini`)
- **Local / Ollama** (`llama3.2`, `deepseek-r1`)
- **Offline Mock Provider** for zero-credential CI and local evaluation.

### 2.4 Resilient Dual-Engine Retrieval
If API rate limits or quota caps are hit on Tavily, the search pipeline automatically falls back to an integrated direct HTTP web extractor, ensuring the agent remains operational without hard crashes.

---

## 3. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 16.3 (Turbopack, App Router) | Zero-latency server rendering, TypeScript strict mode, responsive dual-pane layout |
| **Styling** | Tailwind CSS v4, Lucide Icons, Glassmorphism | Curated modern aesthetic, refined typography (Inter + JetBrains Mono) |
| **Agent Protocol** | CopilotKit 1.51 + AG-UI | Standardized Generative UI event protocol for multi-turn tool rendering |
| **Orchestration** | Python 3.12+, LangGraph, Deep Agents | StateGraph memory checkpointer, deterministic state machine transitions |
| **Web Retrieval** | Tavily Python SDK + Direct Scraper | Full-page contextual grounding without external headless browsers |
| **Package Manager**| `uv` (Astral) + `npm` | Sub-second Python dependency resolution and wheel compilation |
| **DevOps** | Docker, Docker Compose | Production multi-container containerization with automated healthchecks |

---

## 4. Quickstart Guide

### Option A: 1-Click Startup via Docker Compose (Recommended)

Ensure Docker Desktop is running:

```bash
# 1. Clone repository
git clone https://github.com/your-username/ai-deep-research-agent.git
cd ai-deep-research-agent

# 2. Configure environment (set any provider key: Gemini, Claude, or OpenAI)
cp .env.example .env

# 3. Launch both backend and frontend services
docker compose up --build
```

Access the application at [http://localhost:3000](http://localhost:3000).

---

### Option B: Local Development Setup

#### 1. Backend Agent Server (Terminal 1)

```bash
cd agent

# Create virtual environment with uv (or standard python -m venv)
uv venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate

# Install dependencies in editable mode
uv pip install -e .

# Configure API keys (optional: runs in resilient demo mode if unset)
cp ../.env.example .env

# Launch FastAPI server
uv run python main.py
```

*The backend boots on `http://localhost:8123` with health endpoints active.*

#### 2. Next.js Frontend (Terminal 2)

```bash
# In the repository root:
npm install

# Start development server
npm run dev
```

*Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

## 5. API & Observability Endpoints

The backend exposes native observability and health endpoints for enterprise telemetry:

| Endpoint | Method | Description |
|---|---|---|
| `/health` | `GET` | Container healthcheck verifying service status, version, and active LLM provider |
| `/api/info` | `GET` | Returns active provider, search engine mode, and supported model matrix |
| `/api/telemetry` | `GET` | Real-time agent telemetry (uptime, total tool calls, research queries, and latency) |
| `/` | `POST` | AG-UI SSE protocol endpoint for CopilotKit streaming |

Example `/api/telemetry` response:
```json
{
  "uptime_seconds": 342.15,
  "total_tool_calls": 8,
  "total_research_queries": 3,
  "total_sources_gathered": 14,
  "recent_executions": [
    {
      "tool_name": "research",
      "args": { "query": "Kenya Climate Change Act 2023 Regulations" },
      "status": "complete",
      "duration_ms": 2840.5,
      "metadata": { "sources_count": 5 }
    }
  ]
}
```

---

## 6. Forward Deployed Engineering Playbook

This project serves as a reference architecture for:
1. **Corporate Due Diligence:** Synthesizing financial disclosures, regulatory filings, and market reports into executive dossiers with verified source citations.
2. **Statutory & Regulatory Audits:** Tracking compliance directives across statutory portals with immutable audit trails.
3. **Engineering Ground Truth:** Investigating legacy dependencies, closed binaries, and third-party APIs by parsing empirical web evidence rather than querying hallucinated model weights.

---

## 7. License

Licensed under the Apache 2.0 License. Built upon CopilotKit and LangGraph primitives.
