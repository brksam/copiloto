from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import get_settings
from backend.models.database import Document
from backend.rag.ingestor import embed_texts


settings = get_settings()


@dataclass
class RetrievedChunk:
    id: int
    tenant_id: str
    content: str
    source_url: str | None
    score: float


async def retrieve_relevant_chunks(
    session: AsyncSession,
    tenant_id: str,
    query: str,
    top_k: int | None = None,
) -> Sequence[RetrievedChunk]:
    """Busca vetorial por tenant_id e retorna top_k chunks."""
    if top_k is None:
        top_k = settings.RAG_TOP_K

    query_embedding = embed_texts([query])[0]

    distance = Document.embedding.l2_distance(query_embedding).label("score")
    stmt = (
        select(Document, distance)
        .where(Document.tenant_id == tenant_id)
        .order_by(distance.asc())
        .limit(top_k)
    )

    result = await session.execute(stmt)
    rows = result.all()

    out: list[RetrievedChunk] = []
    for doc, score in rows:
        out.append(
            RetrievedChunk(
                id=doc.id,
                tenant_id=doc.tenant_id,
                content=doc.content,
                source_url=doc.source_url,
                score=float(score),
            )
        )
    return out


def format_chunks_as_context(chunks: Sequence[RetrievedChunk], *, max_chars: int | None = None) -> str:
    if not chunks:
        return "Nenhum trecho relevante encontrado para este tenant."

    parts: list[str] = []
    for i, c in enumerate(chunks, start=1):
        src = c.source_url or "desconhecida"
        parts.append(f"[CHUNK {i}] source={src} score={c.score:.4f}\n{c.content}")

    ctx = "\n\n---\n\n".join(parts)
    limit = max_chars or settings.RAG_MAX_CONTEXT_CHARS
    return ctx[:limit]

