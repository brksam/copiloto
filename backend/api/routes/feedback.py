from __future__ import annotations

from typing import Any, Dict, Literal

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from backend.core.dependencies import get_db_session
from backend.models.database import AsyncSession, Feedback


router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackRequest(BaseModel):
    tenant_id: str = Field(..., description="Identificador do tenant")
    message: str = Field(..., description="Pergunta original do usuário")
    response: str = Field(..., description="Resposta do agente")
    rating: Literal["positive", "negative"] = Field(..., description="Avaliação: positive ou negative")
    context: Dict[str, Any] | None = Field(default=None, description="Contexto adicional")


class FeedbackResponse(BaseModel):
    status: str
    id: int


@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackRequest,
    session: AsyncSession = Depends(get_db_session),
) -> FeedbackResponse:
    feedback = Feedback(
        tenant_id=payload.tenant_id,
        message=payload.message,
        response=payload.response,
        rating=payload.rating,
        context=payload.context,
    )
    session.add(feedback)
    await session.commit()
    await session.refresh(feedback)

    return FeedbackResponse(status="ok", id=feedback.id)
