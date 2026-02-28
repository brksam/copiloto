from __future__ import annotations

from typing import Any, Dict, List

import anthropic
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from sqlalchemy import select

from backend.core.config import get_settings
from backend.models.database import AsyncSession, Feedback
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

    async def _get_negative_feedback(
        self, session: AsyncSession, tenant_id: str, limit: int = 5
    ) -> List[str]:
        """Busca as últimas respostas avaliadas negativamente pelo tenant."""
        stmt = (
            select(Feedback.response)
            .where(Feedback.tenant_id == tenant_id, Feedback.rating == "negative")
            .order_by(Feedback.created_at.desc())
            .limit(limit)
        )
        result = await session.execute(stmt)
        return [row[0] for row in result.all()]

    async def chat(
        self,
        *,
        session: AsyncSession,
        tenant_id: str,
        message: str,
        context: Dict[str, Any] | None = None,
        history: List[Dict[str, str]] | None = None,
        screenshot: str | None = None,
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

        # ── Passive learning: fetch negative feedback ──
        negative_responses = await self._get_negative_feedback(session, tenant_id)
        feedback_section = ""
        if negative_responses:
            bad_examples = "\n".join(
                f"  - {resp[:200]}" for resp in negative_responses
            )
            feedback_section = (
                "\n=== APRENDIZADO (evite respostas similares) ===\n"
                "O usuário avaliou negativamente as seguintes respostas. "
                "Evite repeti-las ou dar respostas com tom/conteúdo parecido:\n"
                f"{bad_examples}\n"
                "=== FIM DO APRENDIZADO ===\n\n"
            )

        system_prompt = (
            "Você é um co-piloto de IA especializado em operações de farmácias SaaS.\n"
            "Responda sempre de forma concisa, em PT-BR, e evite inventar dados.\n"
            "Quando não souber algo, admita explicitamente.\n"
            "Se o usuário enviar uma captura de tela, analise-a cuidadosamente e "
            "use as informações visuais para dar suporte contextualizado.\n"
            f"\n{screen_context_line}"
            f"{feedback_section}"
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

        # Current user message — with screenshot: use Anthropic async SDK directly
        if screenshot:
            import logging
            import re
            logger = logging.getLogger("copiloto-farma")
            logger.info(f"Entrando no bloco de screenshot, tamanho: {len(screenshot)}")

            # Strip data URL prefix (handles png, jpeg, webp, etc.)
            clean_b64 = re.sub(r"^data:image/[^;]+;base64,", "", screenshot)

            # Build history for the vision call too
            vision_messages: list[dict] = []
            for entry in history:
                role = entry.get("role", "")
                content = entry.get("content", "")
                if role in ("user", "assistant"):
                    vision_messages.append({"role": role, "content": content})

            vision_messages.append(
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": clean_b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": f"Descreva o que está visível nessa tela e responda: {message}",
                        },
                    ],
                }
            )

            async_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = await async_client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=max(1024, settings.ANTHROPIC_MAX_TOKENS),
                system=system_prompt,
                messages=vision_messages,
            )
            return response.content[0].text

        # Without screenshot: use LangChain as usual
        messages.append(HumanMessage(content=message))

        result = await self._client.ainvoke(messages)  # type: ignore[union-attr]
        return result.content if isinstance(result.content, str) else str(result.content)

orchestrator = ChatOrchestrator()
