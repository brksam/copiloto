#!/usr/bin/env python3
"""
scraper_linx.py — Scraper standalone para ingerir páginas da documentação
Linx Farma Big do Confluence no Copiloto Farma via POST /ingest/url.

Uso:
    python scraper_linx.py
"""

from __future__ import annotations

import time
from pathlib import Path
from urllib.parse import urlparse

import requests

# ── Configuração ──────────────────────────────────────────────────────
INGEST_ENDPOINT = "http://localhost:8000/ingest/url"
TENANT_ID = "farmacia-teste"
PROCESSED_FILE = Path(__file__).parent / "links_processados.txt"
DELAY_SECONDS = 2

URLS = [
    "https://share.linx.com.br/display/FARMA/Linx+Farma+-+Big",
    "https://share.linx.com.br/display/FARMA/Manual+do+Linx+Big",
    "https://share.linx.com.br/display/FARMA/Cadastros",
    "https://share.linx.com.br/display/FARMA/Configuracoes",
    "https://share.linx.com.br/display/FARMA/Financeiros",
    "https://share.linx.com.br/display/FARMA/Fiscais",
    "https://share.linx.com.br/display/FARMA/Gerencial",
    "https://share.linx.com.br/display/FARMA/Operacional",
    "https://share.linx.com.br/display/FARMA/Utilitarios",
    "https://share.linx.com.br/display/FARMA/Artigos+de+Suporte+-+Linx+Big",
    "https://share.linx.com.br/display/FARMA/PDV+-+Big",
    "https://share.linx.com.br/display/FARMA/Plug+and+Play",
    "https://share.linx.com.br/display/FARMA/Retaguarda+-+Big",
    "https://share.linx.com.br/display/FARMA/FAQ+-+Linx+Big+Farma",
    "https://share.linx.com.br/display/FARMA/Perguntas+Frequentes+PDV+-+Big",
    "https://share.linx.com.br/display/FARMA/Perguntas+Frequentes+Retaguarda+-+Big",
    "https://share.linx.com.br/display/FARMA/Perguntas+Frequentes+-+SNGPC",
    "https://share.linx.com.br/display/FARMA/Perguntas+Frequentes+-+Linx+Big+Farma",
    "https://share.linx.com.br/display/FARMA/Consultas+e+Cancelamentos",
    "https://share.linx.com.br/pages/viewpage.action?pageId=18559588",
    "https://share.linx.com.br/pages/viewpage.action?pageId=18559526",
    "https://share.linx.com.br/display/FARMA/Escalation+Path+%7C+Farma+%7C+Big",
    "https://share.linx.com.br/display/FARMA/Perguntas+Frequentes+Sobre+a+Integracao+QUEST+Fidelidade+-+Big",
]


def load_processed() -> set[str]:
    """Carrega links já processados do arquivo txt."""
    if not PROCESSED_FILE.exists():
        return set()
    return {
        line.strip()
        for line in PROCESSED_FILE.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }


def save_processed(url: str) -> None:
    """Adiciona um link ao arquivo de processados."""
    with PROCESSED_FILE.open("a", encoding="utf-8") as f:
        f.write(url + "\n")


def ingest_url(url: str) -> int:
    """Envia uma URL para o endpoint de ingestão e retorna o nº de chunks."""
    payload = {"url": url, "tenant_id": TENANT_ID}
    resp = requests.post(INGEST_ENDPOINT, json=payload, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    return data.get("chunks_ingested", 0)


def main() -> None:
    processed = load_processed()
    pending = [url for url in URLS if url not in processed]

    if not pending:
        print("🎉 Todos os links já foram processados!")
        return

    print(
        f"\n📋 {len(pending)} links pendentes "
        f"({len(processed)} já processados)\n"
    )

    total_chunks = 0
    errors = 0

    for i, url in enumerate(pending, start=1):
        parsed = urlparse(url)
        short_path = parsed.path
        if parsed.query:
            short_path += f"?{parsed.query}"
        print(f"  Ingerindo {i}/{len(pending)}: {short_path} ... ", end="", flush=True)

        try:
            chunks = ingest_url(url)
            total_chunks += chunks
            save_processed(url)
            print(f"✅ {chunks} chunks")
        except requests.HTTPError as exc:
            errors += 1
            status_code = exc.response.status_code if exc.response else "?"
            print(f"⚠️  HTTP {status_code} — pulando")
        except requests.RequestException as exc:
            errors += 1
            print(f"❌ {exc}")

        if i < len(pending):
            time.sleep(DELAY_SECONDS)

    # ── Resumo ──
    print("\n" + "═" * 50)
    print(f"  🏁 Concluído!")
    print(f"     Links ingeridos:  {len(pending) - errors}/{len(pending)}")
    print(f"     Chunks totais:    {total_chunks}")
    if errors:
        print(f"     Pulados (erro):   {errors}")
    print("═" * 50 + "\n")


if __name__ == "__main__":
    main()
