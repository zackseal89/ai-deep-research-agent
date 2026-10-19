"""
Deep Research Assistant Agent

An autonomous research agent built for Forward Deployed AI engineering.
Features:
- Multi-provider model routing (Gemini, Claude, OpenAI, Ollama, Mock)
- Generative UI state synchronization via CopilotKitMiddleware
- Persistent LangGraph StateGraph execution with isolated subagent research tools
- Virtual filesystem operations (write_file, read_file, write_todos)
"""

import os
from dotenv import load_dotenv
from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver
from copilotkit import CopilotKitMiddleware

from provider import create_chat_model, get_configured_provider
from tools import research

load_dotenv()


MAIN_SYSTEM_PROMPT = """You are an elite Deep Research Agent, designed by an AI Forward Deployed Engineering team to plan, investigate, and synthesize rigorous reports on complex topics.

Operating Principles:
1. Always communicate in professional, natural prose. Never output raw JSON or internal callback structures in direct messages.
2. In all workflows, maintain strict grounding: every factual assertion should trace back to information gathered during research.
3. Keep the user informed with clear, actionable plans.

Standard Execution Rhythm:
1. PLAN: Initialize an actionable research roadmap using write_todos.
2. INVESTIGATE: Call research(query) for each distinct dimension of the problem.
3. COMPILE: Write synthesized, audit-grade research reports to /reports/<filename>.md using write_file.
4. UPDATE: Check off completed items in write_todos as you make progress.

Tone: Authoritative, clear, objective, and analytically thorough."""


def build_agent():
    """Build the Deep Research Agent with CopilotKit & LangGraph integration."""
    provider = get_configured_provider()
    llm = create_chat_model(temperature=0.7)

    main_tools = [research]

    # Create the Deep Agent with CopilotKit middleware for generative UI
    agent_graph = create_deep_agent(
        model=llm,
        system_prompt=MAIN_SYSTEM_PROMPT,
        tools=main_tools,
        middleware=[CopilotKitMiddleware()],
        checkpointer=MemorySaver(),
    )

    print(f"[AGENT] Deep Research Agent successfully built with provider='{provider}'")
    print(f"[AGENT] Available tools: {[t.name for t in main_tools]}")

    return agent_graph.with_config({"recursion_limit": 100})
