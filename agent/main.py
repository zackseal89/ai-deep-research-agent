"""
Deep Research Assistant - FastAPI Server

Serves the Deep Research Agent via AG-UI protocol for CopilotKit integration.
Enhanced with multi-provider routing and enterprise telemetry endpoints.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from copilotkit import LangGraphAGUIAgent
from copilotkit.langgraph import copilotkit_customize_config

from agent import build_agent
from provider import get_configured_provider
from telemetry import telemetry

load_dotenv()

app = FastAPI(
    title="Autonomous Deep Research Agent",
    description="Enterprise Forward Deployed AI Research Agent powered by LangGraph, AG-UI & CopilotKit",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Health check endpoint for monitoring and container deployments"""
    return {
        "status": "healthy",
        "service": "deep-research-agent",
        "version": "1.1.0",
        "provider": get_configured_provider(),
    }


@app.get("/api/telemetry")
def get_telemetry():
    """Returns telemetry summary including tool execution history and latency stats"""
    return telemetry.get_summary()


@app.get("/api/info")
def get_info():
    """Returns system configuration and supported model providers"""
    return {
        "active_provider": get_configured_provider(),
        "supported_providers": ["gemini", "anthropic", "openai", "ollama", "mock"],
        "has_tavily_key": bool(os.environ.get("TAVILY_API_KEY")),
        "search_mode": "Tavily (Primary)" if os.environ.get("TAVILY_API_KEY") else "Direct / Fallback Scrape",
    }


# Build and register the Deep Research Agent
try:
    agent_graph = build_agent()

    agui_config = copilotkit_customize_config(
        emit_tool_calls=[
            "research",
            "write_todos",
            "write_file",
            "read_file",
            "edit_file",
        ]
    )
    agui_config["recursion_limit"] = 100

    add_langgraph_fastapi_endpoint(
        app=app,
        agent=LangGraphAGUIAgent(
            name="research_assistant",
            description="Autonomous deep research assistant that plans, searches, and synthesizes research dossiers",
            graph=agent_graph,
            config=agui_config,
        ),
        path="/",
    )

    print("[SERVER] Deep Research Agent successfully registered at /")
except Exception as e:
    print(f"[ERROR] Failed to build agent: {e}")
    raise


def main():
    """Run the server with uvicorn"""
    import uvicorn

    host = os.getenv("SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("SERVER_PORT", "8123"))

    print(f"[SERVER] Starting on {host}:{port}")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
