from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from backend.core.dependencies import get_db_session
from backend.models.database import AsyncSession, Conversation, MessageRecord


router = APIRouter(prefix="/conversations", tags=["conversations"])


# ── Schemas ─────────────────────────────────────────────────────

class CreateConversationRequest(BaseModel):
    tenant_id: str = Field(..., description="Identificador do tenant")


class CreateConversationResponse(BaseModel):
    conversation_id: str


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: str


class SaveMessageRequest(BaseModel):
    role: str = Field(..., description="user ou assistant")
    content: str


class SaveMessageResponse(BaseModel):
    id: int


# ── Routes ──────────────────────────────────────────────────────

@router.post("/", response_model=CreateConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: CreateConversationRequest,
    session: AsyncSession = Depends(get_db_session),
) -> CreateConversationResponse:
    conv_id = str(uuid.uuid4())
    conv = Conversation(id=conv_id, tenant_id=payload.tenant_id)
    session.add(conv)
    await session.commit()
    return CreateConversationResponse(conversation_id=conv_id)


@router.get("/{conversation_id}/messages", response_model=List[MessageOut])
async def get_messages(
    conversation_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> List[MessageOut]:
    # Verify conversation exists
    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    conv_result = await session.execute(conv_stmt)
    if conv_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")

    stmt = (
        select(MessageRecord)
        .where(MessageRecord.conversation_id == conversation_id)
        .order_by(MessageRecord.created_at.asc())
    )
    result = await session.execute(stmt)
    messages = result.scalars().all()

    return [
        MessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=str(m.created_at),
        )
        for m in messages
    ]


@router.post("/{conversation_id}/messages", response_model=SaveMessageResponse, status_code=status.HTTP_201_CREATED)
async def save_message(
    conversation_id: str,
    payload: SaveMessageRequest,
    session: AsyncSession = Depends(get_db_session),
) -> SaveMessageResponse:
    msg = MessageRecord(
        conversation_id=conversation_id,
        role=payload.role,
        content=payload.content,
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return SaveMessageResponse(id=msg.id)
