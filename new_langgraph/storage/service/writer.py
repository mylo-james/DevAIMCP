"""Document ingestion helpers for the knowledge store."""
from __future__ import annotations

from typing import Mapping

from .search import HybridKnowledgeStore


class KnowledgeStoreWriter:
    """High-level API for inserting documents into the knowledge store."""

    def __init__(self, store: HybridKnowledgeStore) -> None:
        self._store = store

    def add_document(self, content: str, *, metadata: Mapping[str, object] | None = None, collection: str = "documents") -> str:
        """Delegate document insertion to the underlying store."""
        return self._store.add_document(content, metadata=metadata, collection=collection)


__all__ = ["KnowledgeStoreWriter"]
