from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Iterable, Sequence

import requests
import voyageai
from bs4 import BeautifulSoup
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import get_settings
from backend.models.database import Document


settings = get_settings()


@dataclass
class IngestResult:
    tenant_id: str
    source_url: str | None
    chunks_ingested: int


def scrape_url_text(url: str) -> str:
    resp = requests.get(url, timeout=30, headers={"User-Agent": "copiloto-farma/0.1"})
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    # Prioriza a área principal se existir
    main = soup.find("main") or soup.find("article") or soup.body
    text = main.get_text(separator="\n", strip=True) if main else soup.get_text(separator="\n", strip=True)

    # Remove linhas muito curtas e repetição
    lines = [ln.strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if len(ln) >= 3]
    return "\n".join(lines)


def extract_pdf_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(pdf_bytes))
    parts: list[str] = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text.strip():
            parts.append(page_text.strip())
    return "\n\n".join(parts).strip()


def chunk_text_tokens(text: str, *, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    # Aproximação de "tokens" via palavras (suficiente para MVP).
    tokens = text.split()
    if not tokens:
        return []

    chunks: list[str] = []
    step = max(1, chunk_size - overlap)
    for start in range(0, len(tokens), step):
        end = min(len(tokens), start + chunk_size)
        chunk_tokens = tokens[start:end]
        if chunk_tokens:
            chunks.append(" ".join(chunk_tokens))
        if end >= len(tokens):
            break
    return chunks


def _normalize(vec: list[float]) -> list[float]:
    import math

    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _fit_to_dim(vec: list[float], dim: int) -> list[float]:
    if len(vec) == dim:
        return vec
    if len(vec) > dim:
        return vec[:dim]
    return vec + [0.0] * (dim - len(vec))


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not settings.VOYAGE_API_KEY:
        raise RuntimeError("VOYAGE_API_KEY não configurada.")

    client = voyageai.Client(api_key=settings.VOYAGE_API_KEY)
    resp = client.embed(
        texts=texts,
        model=settings.VOYAGE_MODEL_NAME,
        input_type="document",
    )
    base_vecs = resp.embeddings

    out: list[list[float]] = []
    for v in base_vecs:
        v = list(map(float, v))
        out.append(_normalize(_fit_to_dim(v, settings.EMBEDDING_DIM)))
    return out


async def ingest_chunks(
    session: AsyncSession,
    *,
    tenant_id: str,
    chunks: Sequence[str],
    source_url: str | None,
) -> IngestResult:
    if not chunks:
        return IngestResult(tenant_id=tenant_id, source_url=source_url, chunks_ingested=0)

    embeddings = embed_texts(list(chunks))

    docs = [
        Document(
            tenant_id=tenant_id,
            content=chunk,
            embedding=emb,
            source_url=source_url,
        )
        for chunk, emb in zip(chunks, embeddings, strict=True)
    ]

    session.add_all(docs)
    await session.commit()

    return IngestResult(tenant_id=tenant_id, source_url=source_url, chunks_ingested=len(docs))


async def ingest_url(
    session: AsyncSession,
    *,
    tenant_id: str,
    url: str,
) -> IngestResult:
    text = scrape_url_text(url)
    chunks = chunk_text_tokens(text, chunk_size=500, overlap=50)
    return await ingest_chunks(session, tenant_id=tenant_id, chunks=chunks, source_url=url)


async def ingest_pdf(
    session: AsyncSession,
    *,
    tenant_id: str,
    pdf_bytes: bytes,
    source_url: str | None = None,
) -> IngestResult:
    text = extract_pdf_text(pdf_bytes)
    chunks = chunk_text_tokens(text, chunk_size=500, overlap=50)
    return await ingest_chunks(session, tenant_id=tenant_id, chunks=chunks, source_url=source_url)


async def count_documents(session: AsyncSession, tenant_id: str) -> int:
    stmt = select(Document.id).where(Document.tenant_id == tenant_id)
    result = await session.execute(stmt)
    return len(result.fetchall())

