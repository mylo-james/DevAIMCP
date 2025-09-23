"""Snippet retrieval helper functions."""
from __future__ import annotations

from typing import Optional

from ..storage import HybridKnowledgeStore


def retrieve_snippets(
    query: str,
    knowledge_store: HybridKnowledgeStore | None,
    *,
    role: str,
    collection: str = "documents",
    limit: int = 3,
) -> str:
    """Retrieve the top snippets from the knowledge store for the query."""
    if not knowledge_store:
        return ""
    results = knowledge_store.search(query, collection=collection, limit=limit)
    lines = [f"[{role}] {result.score:.2f}: {result.content[:200]}" for result in results]
    return "\n".join(lines)


__all__ = ["retrieve_snippets"]
