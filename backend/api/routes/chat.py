from __future__ import annotations

from typing import Any, Dict, List, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.agents.orchestrator import orchestrator
from backend.core.dependencies import get_db_session
from backend.models.database import AsyncSession


router = APIRouter(tags=["chat"])


class HistoryEntry(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., description="Mensagem do usuário")
    tenant_id: str = Field(..., description="Identificador do tenant (farmácia/cliente)")
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

    return ChatResponse(response=answer)
