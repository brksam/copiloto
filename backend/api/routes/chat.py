from __future__ import annotations

from typing import Any, Dict, List, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.agents.orchestrator import orchestrator
from backend.core.dependencies import get_db_session
from backend.models.database import AsyncSession, Conversation, MessageRecord


router = APIRouter(tags=["chat"])


class HistoryEntry(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., description="Mensagem do usuário")
    tenant_id: str = Field(..., description="Identificador do tenant (farmácia/cliente)")
    conversation_id: str | None = Field(default=None, description="ID da conversa para persistência")
    context: Dict[str, Any] | None = Field(
        default=None,
        description="Contexto adicional arbitrário (ex: usuário logado, tela atual, etc.)",
    )
    history: List[HistoryEntry] = Field(
        default_factory=list,
        description="Histórico de mensagens anteriores da conversa",
    )


class ChatResponse(BaseModel):
    response: str


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    payload: ChatRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ChatResponse:
    try:
        answer = await orchestrator.chat(
            session=session,
            tenant_id=payload.tenant_id,
            message=payload.message,
            context=payload.context,
            history=[h.model_dump() for h in payload.history],
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    # ── Persist messages if conversation_id provided ──
    if payload.conversation_id:
        try:
            # Ensure conversation exists (create if not)
            from sqlalchemy import select
            conv_stmt = select(Conversation).where(Conversation.id == payload.conversation_id)
            conv_result = await session.execute(conv_stmt)
            if conv_result.scalar_one_or_none() is None:
                conv = Conversation(id=payload.conversation_id, tenant_id=payload.tenant_id)
                session.add(conv)

            # Save user message
            user_msg = MessageRecord(
                conversation_id=payload.conversation_id,
                role="user",
                content=payload.message,
            )
            session.add(user_msg)

            # Save assistant message
            assistant_msg = MessageRecord(
                conversation_id=payload.conversation_id,
                role="assistant",
                content=answer,
            )
            session.add(assistant_msg)

            await session.commit()
        except Exception:
            # Don't fail the chat response if persistence fails
            pass

    return ChatResponse(response=answer)
