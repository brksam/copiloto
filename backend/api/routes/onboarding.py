from __future__ import annotations

import asyncio
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from backend.core.dependencies import get_db_session
from backend.models.database import AsyncSession, OnboardingJob
from backend.rag.crawler import run_onboarding


router = APIRouter(prefix="/onboarding", tags=["onboarding"])


# ── Request / Response schemas ──────────────────────────────────

class OnboardingStartRequest(BaseModel):
    tenant_id: str = Field(..., description="Identificador do tenant")
    root_url: str = Field(..., description="URL raiz da documentação")
    product_name: str = Field(..., description="Nome do produto, ex: Linx Big Farma")
    max_pages: int = Field(default=50, ge=1, le=500, description="Limite de páginas")


class OnboardingStartResponse(BaseModel):
    status: str
    job_id: str


class OnboardingStatusResponse(BaseModel):
    job_id: str
    tenant_id: str
    root_url: str
    product_name: str
    status: str
    pages_found: int
    pages_processed: int
    chunks_total: int
    percent: int
    error_message: str | None = None


# ── Routes ──────────────────────────────────────────────────────

@router.post("/start", response_model=OnboardingStartResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_onboarding(
    payload: OnboardingStartRequest,
    session: AsyncSession = Depends(get_db_session),
) -> OnboardingStartResponse:
    job_id = str(uuid.uuid4())

    job = OnboardingJob(
        id=job_id,
        tenant_id=payload.tenant_id,
        root_url=payload.root_url,
        product_name=payload.product_name,
        status="pending",
        pages_found=0,
        pages_processed=0,
        chunks_total=0,
    )
    session.add(job)
    await session.commit()

    # Fire background task via asyncio (not FastAPI BackgroundTasks,
    # because FastAPI's BackgroundTasks run after response but block
    # the same worker — asyncio.create_task is truly concurrent).
    asyncio.create_task(
        run_onboarding(
            job_id=job_id,
            root_url=payload.root_url,
            tenant_id=payload.tenant_id,
            max_pages=payload.max_pages,
        )
    )

    return OnboardingStartResponse(status="started", job_id=job_id)


@router.get("/status/{job_id}", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    job_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> OnboardingStatusResponse:
    stmt = select(OnboardingJob).where(OnboardingJob.id == job_id)
    result = await session.execute(stmt)
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(status_code=404, detail="Job não encontrado")

    percent = 0
    if job.pages_found > 0:
        percent = min(100, int((job.pages_processed / job.pages_found) * 100))

    return OnboardingStatusResponse(
        job_id=job.id,
        tenant_id=job.tenant_id,
        root_url=job.root_url,
        product_name=job.product_name,
        status=job.status,
        pages_found=job.pages_found,
        pages_processed=job.pages_processed,
        chunks_total=job.chunks_total,
        percent=percent,
        error_message=job.error_message,
    )
