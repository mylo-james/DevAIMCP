"""Storage entry points and helpers."""
from __future__ import annotations

from functools import lru_cache
from typing import Any

from .service.search import HybridKnowledgeStore


@lru_cache(maxsize=1)
def get_knowledge_store() -> HybridKnowledgeStore:
    """Return a singleton in-memory knowledge store instance populated with BMAD assets."""
    store = HybridKnowledgeStore()
    from ..assets.library import seed_library

    seed_library(store)
    return store


__all__ = ["get_knowledge_store", "HybridKnowledgeStore"]
