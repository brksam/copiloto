"""Crawler de documentação para onboarding automático de tenants."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Set
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from sqlalchemy import update

from backend.models.database import AsyncSessionMaker, OnboardingJob
from backend.rag.ingestor import (
    chunk_text_tokens,
    embed_texts,
    ingest_chunks,
    scrape_url_text,
)


logger = logging.getLogger("copiloto-farma.crawler")

# Extensions and path patterns to skip
SKIP_EXTENSIONS = {
    ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".eot", ".pdf", ".zip", ".gz",
    ".mp4", ".mp3", ".webp", ".avif",
}

SKIP_PATHS = {
    "/login", "/logout", "/signin", "/signout", "/signup",
    "/register", "/auth", "/oauth", "/sso",
    "/static", "/assets", "/dist", "/build",
    "/api/", "/_next/", "/__",
}

REQUEST_DELAY = 25  # seconds between requests (Voyage free tier: 3 req/min)
REQUEST_TIMEOUT = 30
EMBED_MAX_RETRIES = 3
EMBED_RETRY_DELAY = 30  # seconds between retry attempts


def _is_valid_link(href: str, base_domain: str) -> bool:
    """Check if a link is a valid internal documentation page."""
    if not href or href.startswith(("#", "mailto:", "javascript:", "tel:")):
        return False

    parsed = urlparse(href)

    # Must be same domain (or relative)
    if parsed.netloc and parsed.netloc != base_domain:
        return False

    # Skip known bad extensions
    path_lower = parsed.path.lower()
    if any(path_lower.endswith(ext) for ext in SKIP_EXTENSIONS):
        return False

    # Skip known bad paths
    if any(skip in path_lower for skip in SKIP_PATHS):
        return False

    return True


def discover_links(root_url: str, max_pages: int) -> list[str]:
    """Fetch root_url and discover internal links up to max_pages."""
    parsed_root = urlparse(root_url)
    base_domain = parsed_root.netloc

    discovered: list[str] = []
    visited: Set[str] = set()
    queue: list[str] = [root_url]

    while queue and len(discovered) < max_pages:
        url = queue.pop(0)

        # Normalize
        normalized = urlparse(url)._replace(fragment="").geturl()
        if normalized in visited:
            continue
        visited.add(normalized)
        discovered.append(normalized)

        # Don't crawl further pages for link discovery beyond a reasonable depth
        if len(discovered) >= max_pages:
            break

        try:
            resp = requests.get(
                url,
                timeout=REQUEST_TIMEOUT,
                headers={"User-Agent": "copiloto-farma-crawler/0.1"},
            )
            resp.raise_for_status()
        except Exception as exc:
            logger.warning("Erro ao acessar %s: %s", url, exc)
            continue

        soup = BeautifulSoup(resp.text, "html.parser")

        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            full_url = urljoin(url, href)

            # Clean fragment
            full_url = urlparse(full_url)._replace(fragment="").geturl()

            if full_url not in visited and _is_valid_link(full_url, base_domain):
                queue.append(full_url)

    return discovered[:max_pages]


async def _update_job(job_id: str, **fields) -> None:
    """Update onboarding job fields in a fresh session."""
    async with AsyncSessionMaker() as session:
        stmt = update(OnboardingJob).where(OnboardingJob.id == job_id).values(**fields)
        await session.execute(stmt)
        await session.commit()


async def _embed_with_retry(loop, chunks: list[str], job_id: str, url: str) -> list[list[float]]:
    """Embed texts with automatic retry on rate limit / transient errors."""
    for attempt in range(1, EMBED_MAX_RETRIES + 1):
        try:
            embeddings = await loop.run_in_executor(None, embed_texts, chunks)
            return embeddings
        except Exception as exc:
            if attempt < EMBED_MAX_RETRIES:
                logger.warning(
                    "Onboarding [%s] — embed falhou para %s (tentativa %d/%d): %s — "
                    "aguardando %ds antes de retry",
                    job_id, url, attempt, EMBED_MAX_RETRIES, exc, EMBED_RETRY_DELAY,
                )
                await asyncio.sleep(EMBED_RETRY_DELAY)
            else:
                logger.error(
                    "Onboarding [%s] — embed falhou para %s após %d tentativas: %s",
                    job_id, url, EMBED_MAX_RETRIES, exc,
                )
                raise


async def run_onboarding(job_id: str, root_url: str, tenant_id: str, max_pages: int) -> None:
    """Background task: discover pages, scrape, embed, ingest."""

    logger.info("Onboarding [%s] iniciado — tenant=%s root=%s max=%d", job_id, tenant_id, root_url, max_pages)

    await _update_job(
        job_id,
        status="running",
        started_at=datetime.now(timezone.utc),
    )

    try:
        # 1. Discover links (sync — runs in thread pool)
        loop = asyncio.get_running_loop()
        urls = await loop.run_in_executor(None, discover_links, root_url, max_pages)

        await _update_job(job_id, pages_found=len(urls))
        logger.info("Onboarding [%s] — %d páginas encontradas", job_id, len(urls))

        pages_processed = 0
        chunks_total = 0

        # 2. Process each URL
        for url in urls:
            try:
                # Scrape in thread pool (sync requests)
                text = await loop.run_in_executor(None, scrape_url_text, url)

                if not text or len(text.strip()) < 50:
                    logger.debug("Onboarding [%s] — página vazia: %s", job_id, url)
                    pages_processed += 1
                    await _update_job(job_id, pages_processed=pages_processed)
                    continue

                chunks = chunk_text_tokens(text, chunk_size=500, overlap=50)
                if not chunks:
                    pages_processed += 1
                    await _update_job(job_id, pages_processed=pages_processed)
                    continue

                # Embed with retry (handles Voyage rate limits)
                embeddings = await _embed_with_retry(loop, chunks, job_id, url)

                # Insert into DB
                async with AsyncSessionMaker() as session:
                    await ingest_chunks(
                        session,
                        tenant_id=tenant_id,
                        chunks=chunks,
                        source_url=url,
                    )

                pages_processed += 1
                chunks_total += len(chunks)

                await _update_job(
                    job_id,
                    pages_processed=pages_processed,
                    chunks_total=chunks_total,
                )

                logger.info(
                    "Onboarding [%s] — %d/%d — %s (%d chunks, total %d)",
                    job_id, pages_processed, len(urls), url, len(chunks), chunks_total,
                )

            except Exception as exc:
                logger.error(
                    "Onboarding [%s] — pulando %s após falha: %s",
                    job_id, url, exc,
                )
                pages_processed += 1
                await _update_job(job_id, pages_processed=pages_processed)

            # Respect delay between requests (Voyage free tier)
            await asyncio.sleep(REQUEST_DELAY)

        await _update_job(
            job_id,
            status="completed",
            finished_at=datetime.now(timezone.utc),
        )

        logger.info(
            "Onboarding [%s] concluído — %d páginas, %d chunks",
            job_id, pages_processed, chunks_total,
        )

    except Exception as exc:
        logger.exception("Onboarding [%s] falhou: %s", job_id, exc)
        await _update_job(
            job_id,
            status="failed",
            error_message=str(exc)[:500],
            finished_at=datetime.now(timezone.utc),
        )
