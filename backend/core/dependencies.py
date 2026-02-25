from collections.abc import AsyncGenerator

from fastapi import Depends

from backend.core.config import Settings, get_settings
from backend.models.database import AsyncSession, get_async_session


def get_app_settings() -> Settings:
    return get_settings()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_async_session():
        yield session


def get_tenant_id(tenant_id: str) -> str:
    # Para o MVP, o tenant_id vem direto do payload.
    # Em versões futuras, pode vir de header, auth, etc.
    return tenant_id
