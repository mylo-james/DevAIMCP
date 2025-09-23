"""Hybrid knowledge store implementation."""
from __future__ import annotations

import uuid
from collections import defaultdict
from typing import Iterable, Mapping

from ..models import DocumentRecord, SearchResult
from .base import BaseKnowledgeStore
from .hybrid import hybrid_score
from .keyword import keyword_score
from .vector import vector_score


class HybridKnowledgeStore(BaseKnowledgeStore):
    """In-memory implementation of a hybrid knowledge store."""

    def __init__(self) -> None:
        self._documents: dict[str, list[DocumentRecord]] = defaultdict(list)

    def add_document(
        self,
        content: str,
        *,
        metadata: Mapping[str, object] | None = None,
        collection: str = "documents",
    ) -> str:
        metadata_dict = dict(metadata or {})
        doc_id = metadata_dict.get("id")
        if not isinstance(doc_id, str) or not doc_id:
            doc_id = str(uuid.uuid4())
        record = DocumentRecord(doc_id=doc_id, content=content, metadata=metadata_dict, collection=collection)
        self._documents[collection].append(record)
        return doc_id

    def search(self, query: str, *, collection: str = "documents", limit: int = 5) -> Iterable[SearchResult]:
        return self._rank(query, collection=collection, limit=limit, mode="hybrid")

    def keyword_search(self, query: str, *, collection: str = "documents", limit: int = 5) -> Iterable[SearchResult]:
        return self._rank(query, collection=collection, limit=limit, mode="keyword")

    def vector_search(self, query: str, *, collection: str = "documents", limit: int = 5) -> Iterable[SearchResult]:
        return self._rank(query, collection=collection, limit=limit, mode="vector")

    def _rank(self, query: str, *, collection: str, limit: int, mode: str) -> list[SearchResult]:
        records = self._documents.get(collection, [])
        scored: list[tuple[float, DocumentRecord]] = []
        for record in records:
            if mode == "keyword":
                score = keyword_score(query, record.content)
            elif mode == "vector":
                score = vector_score(query, record.content)
            else:
                score = hybrid_score(query, record.content)
            if score <= 0:
                continue
            scored.append((score, record))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        if limit <= 0:
            return []
        results: list[SearchResult] = []
        for score, record in scored[:limit]:
            results.append(
                SearchResult(
                    content=record.content,
                    score=score,
                    metadata=record.metadata,
                    mode=mode,
                )
            )
        return results


__all__ = ["HybridKnowledgeStore"]
