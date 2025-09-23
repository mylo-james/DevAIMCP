"""Database configuration dataclasses and defaults."""
from __future__ import annotations

from dataclasses import dataclass

from .env import get_env

DEFAULT_PG_URL = "postgresql+psycopg://bmad:bmad@localhost:5432/bmad"
DEFAULT_VECTOR_DIM = 1536
DEFAULT_COLLECTION = "bmad_documents"


@dataclass(frozen=True)
class DatabaseConfig:
    """Normalized database settings for storage and retrieval services."""

    url: str = DEFAULT_PG_URL
    vector_dim: int = DEFAULT_VECTOR_DIM
    collection: str = DEFAULT_COLLECTION


def database_config() -> DatabaseConfig:
    """Assemble the database configuration using environment overrides."""
    url = get_env("PG_CONNECTION_STRING", DEFAULT_PG_URL) or DEFAULT_PG_URL

    vector_dim_raw = get_env("BMAD_VECTOR_DIM")
    try:
        vector_dim = int(vector_dim_raw) if vector_dim_raw is not None else DEFAULT_VECTOR_DIM
    except (TypeError, ValueError):
        vector_dim = DEFAULT_VECTOR_DIM

    collection = get_env("BMAD_COLLECTION_NAME", DEFAULT_COLLECTION) or DEFAULT_COLLECTION
    return DatabaseConfig(url=url, vector_dim=vector_dim, collection=collection)


__all__ = [
    "DEFAULT_COLLECTION",
    "DEFAULT_PG_URL",
    "DEFAULT_VECTOR_DIM",
    "DatabaseConfig",
    "database_config",
]
