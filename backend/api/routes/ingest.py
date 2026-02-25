from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field, HttpUrl

from backend.core.dependencies import get_db_session
from backend.models.database import AsyncSession
from backend.rag.ingestor import IngestResult, ingest_pdf, ingest_url


router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestUrlRequest(BaseModel):
    url: HttpUrl
    tenant_id: str = Field(..., description="Identificador do tenant (isolamento multi-tenant)")


class IngestResponse(BaseModel):
    tenant_id: str
    source_url: str | None
    chunks_ingested: int


@router.post("/url", response_model=IngestResponse)
async def ingest_url_endpoint(
    payload: IngestUrlRequest,
    session: AsyncSession = Depends(get_db_session),
) -> IngestResponse:
    try:
        result: IngestResult = await ingest_url(
            session=session,
            tenant_id=payload.tenant_id,
            url=str(payload.url),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Falha ao ingerir URL: {exc}",
        ) from exc

    return IngestResponse(**result.__dict__)


@router.post("/pdf", response_model=IngestResponse)
async def ingest_pdf_endpoint(
    tenant_id: str = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
) -> IngestResponse:
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie um arquivo PDF (content-type application/pdf).",
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF vazio.",
        )

    try:
        result: IngestResult = await ingest_pdf(
            session=session,
            tenant_id=tenant_id,
            pdf_bytes=pdf_bytes,
            source_url=file.filename,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Falha ao ingerir PDF: {exc}",
        ) from exc

    return IngestResponse(**result.__dict__)

