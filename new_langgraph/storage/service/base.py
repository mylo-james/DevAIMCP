"""Base knowledge store abstraction."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterable, Mapping

from ..models import DocumentRecord, SearchResult


class BaseKnowledgeStore(ABC):
    """Abstract interface implemented by knowledge store backends."""

    @abstractmethod
    def add_document(self, content: str, *, metadata: Mapping[str, object] | None = None, collection: str = "documents") -> str:
        """Persist a document and return its identifier."""

    @abstractmethod
    def search(self, query: str, *, collection: str = "documents", limit: int = 5) -> Iterable[SearchResult]:
        """Execute a hybrid search query."""

    @abstractmethod
    def keyword_search(self, query: str, *, collection: str = "documents", limit: int = 5) -> Iterable[SearchResult]:
        """Execute a keyword-only search query."""

    @abstractmethod
    def vector_search(self, query: str, *, collection: str = "documents", limit: int = 5) -> Iterable[SearchResult]:
        """Execute an embedding-based similarity search query."""


__all__ = ["BaseKnowledgeStore"]
