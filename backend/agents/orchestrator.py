from __future__ import annotations

from typing import Any, Dict, List

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from backend.core.config import get_settings
from backend.models.database import AsyncSession
from backend.rag.retriever import format_chunks_as_context, retrieve_relevant_chunks


settings = get_settings()


class ChatOrchestrator:
    """Orquestrador de chamadas ao LLM com RAG."""

    def __init__(self) -> None:
        if not settings.ANTHROPIC_API_KEY:
            self._client: ChatAnthropic | None = None
        else:
            self._client = ChatAnthropic(
                api_key=settings.ANTHROPIC_API_KEY,
                model=settings.ANTHROPIC_MODEL,
                max_tokens=settings.ANTHROPIC_MAX_TOKENS,
            )

    async def chat(
        self,
        *,
        session: AsyncSession,
        tenant_id: str,
        message: str,
        context: Dict[str, Any] | None = None,
        history: List[Dict[str, str]] | None = None,
    ) -> str:
        if self._client is None:
            raise RuntimeError(
                "ANTHROPIC_API_KEY não configurada. "
                "Defina no .env ou nas variáveis de ambiente."
            )

        context = context or {}
        history = history or []

        chunks = await retrieve_relevant_chunks(
            session=session,
            tenant_id=tenant_id,
            query=message,
        )

        rag_context = format_chunks_as_context(chunks)

        # ── Build screen-context awareness ──
        page_title = context.get("page_title", "")
        current_url = context.get("current_url", "")
        screen_context_line = ""
        if page_title or current_url:
            screen_context_line = (
                f"O usuário está na tela: {page_title} ({current_url})\n"
            )

        system_prompt = (
            "Você é um co-piloto de IA especializado em operações de farmácias SaaS.\n"
            "Responda sempre de forma concisa, em PT-BR, e evite inventar dados.\n"
            "Quando não souber algo, admita explicitamente.\n"
            f"\n{screen_context_line}"
            f"=== CONTEXTO RAG ===\n{rag_context}\n"
            f"=== FIM DO CONTEXTO ===\n\n"
            f"Contexto adicional da requisição (JSON): {context}"
        )

        # ── Build messages array with conversation history ──
        messages: list[SystemMessage | HumanMessage | AIMessage] = [
            SystemMessage(content=system_prompt),
        ]

        for entry in history:
            role = entry.get("role", "")
            content = entry.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))

        # Current user message
        messages.append(HumanMessage(content=message))

        result = await self._client.ainvoke(messages)  # type: ignore[union-attr]
        return result.content if isinstance(result.content, str) else str(result.content)

orchestrator = ChatOrchestrator()
