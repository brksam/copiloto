from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes.chat import router as chat_router
from backend.api.routes.health import router as health_router
from backend.api.routes.ingest import router as ingest_router
from backend.core.config import get_settings
from backend.models.database import init_db


settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("copiloto-farma")


def create_app() -> FastAPI:
    app = FastAPI(title="Copiloto Farma API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:8080",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(chat_router)
    app.include_router(ingest_router)

    @app.on_event("startup")
    async def on_startup() -> None:
        logger.info("Inicializando banco de dados...")
        await init_db()
        logger.info("Banco de dados pronto.")

    return app


app = create_app()

