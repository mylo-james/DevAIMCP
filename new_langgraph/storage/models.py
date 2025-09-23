"""Storage models for the hybrid knowledge store."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass(slots=True)
class DocumentRecord:
    """Concrete representation of a stored document chunk."""

    doc_id: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    collection: str = "documents"


@dataclass(slots=True)
class SearchResult:
    """Normalized search result returned by the knowledge store."""

    content: str
    score: float
    metadata: Dict[str, Any]
    mode: str


__all__ = ["DocumentRecord", "SearchResult"]
