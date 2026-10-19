"""
LLM Provider Factory for Deep Research Agent

Supports multiple model providers for enterprise Forward Deployed AI implementations:
- Google Gemini (gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-pro)
- OpenAI (gpt-4o, gpt-5.5, gpt-4o-mini)
- Anthropic Claude (claude-3-5-sonnet, claude-3-7-sonnet)
- Ollama / Local (llama3.2, deepseek-r1)
- Mock / Offline demo provider for zero-key evaluation

Auto-detects active provider based on environment variables or explicit LLM_PROVIDER.
"""

import os
from typing import Optional
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage


class MockChatModel(BaseChatModel):
    """Fallback mock chat model for local offline demonstrations and zero-key CI."""

    model_name: str = "mock-fde-researcher"

    def _generate(self, messages: list[BaseMessage], stop=None, run_manager=None, **kwargs):
        last_msg = messages[-1].content if messages else ""
        content = (
            f"### Deep Research Synthesis\n\n"
            f"Based on the investigation into: **{last_msg[:120]}**, "
            f"the research agent gathered multi-source findings across regulatory standards, "
            f"architecture benchmarks, and runtime execution data.\n\n"
            f"Key Takeaways:\n"
            f"1. **Deterministic Architecture:** Enterprise AI systems require explicit guardrails and grounded tool use.\n"
            f"2. **Evidence-Based Insights:** Eliminating hallucination via verified search and virtual filesystem artifacts.\n"
            f"3. **Operational Telemetry:** End-to-end tracing guarantees auditability in production deployments."
        )
        return {"generations": [{"text": content, "message": AIMessage(content=content)}]}

    @property
    def _llm_type(self) -> str:
        return "mock-fde-chat-model"


def get_configured_provider() -> str:
    """Detect which provider should be used based on configuration and available keys."""
    explicit = os.environ.get("LLM_PROVIDER", "").strip().lower()
    if explicit in ["openai", "gemini", "google", "anthropic", "claude", "ollama", "mock"]:
        return "gemini" if explicit == "google" else ("anthropic" if explicit == "claude" else explicit)

    # Auto-detection heuristic
    if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
        return "gemini"
    if os.environ.get("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    if os.environ.get("OLLAMA_BASE_URL"):
        return "ollama"

    return "mock"


def create_chat_model(model_name: Optional[str] = None, temperature: float = 0.7) -> BaseChatModel:
    """Instantiate the chat model corresponding to the detected or requested provider."""
    provider = get_configured_provider()

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        target_model = model_name or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        print(f"[LLM] Initializing Google Gemini provider with model={target_model}")
        return ChatGoogleGenerativeAI(
            model=target_model,
            google_api_key=key,
            temperature=temperature,
        )

    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        key = os.environ.get("ANTHROPIC_API_KEY")
        target_model = model_name or os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
        print(f"[LLM] Initializing Anthropic Claude provider with model={target_model}")
        return ChatAnthropic(
            model=target_model,
            anthropic_api_key=key,
            temperature=temperature,
        )

    elif provider == "openai":
        from langchain_openai import ChatOpenAI

        key = os.environ.get("OPENAI_API_KEY")
        target_model = model_name or os.environ.get("OPENAI_MODEL", "gpt-4o")
        print(f"[LLM] Initializing OpenAI provider with model={target_model}")
        return ChatOpenAI(
            model=target_model,
            api_key=key,
            temperature=temperature,
        )

    elif provider == "ollama":
        from langchain_openai import ChatOpenAI

        base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")
        target_model = model_name or os.environ.get("OLLAMA_MODEL", "llama3.2")
        print(f"[LLM] Initializing Local/Ollama provider at {base_url} with model={target_model}")
        return ChatOpenAI(
            base_url=base_url,
            api_key="ollama",
            model=target_model,
            temperature=temperature,
        )

    else:
        print("[LLM] Notice: No external API keys found. Initializing Mock/Offline provider for evaluation.")
        return MockChatModel()
