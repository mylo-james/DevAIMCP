"""Persist story outputs to the knowledge store."""
from __future__ import annotations

from typing import Mapping

from ....storage import HybridKnowledgeStore


def store_document(
    store: HybridKnowledgeStore | None,
    content: str,
    *,
    collection: str,
    metadata: Mapping[str, object],
    doc_id: str | None = None,
) -> str | None:
    """Store the document when a knowledge store is available."""
    if store is None:
        return None
    enriched = dict(metadata)
    if doc_id:
        enriched.setdefault("id", doc_id)
    return store.add_document(content, metadata=enriched, collection=collection)


__all__ = ["store_document"]
