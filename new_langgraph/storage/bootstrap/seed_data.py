"""Seed storage with default data."""
from __future__ import annotations

from .. import get_knowledge_store
from ..models import DocumentRecord


def seed_default_documents(records: list[DocumentRecord]) -> int:
    """Insert the provided records into the knowledge store."""
    store = get_knowledge_store()
    for record in records:
        store.add_document(
            record.content,
            metadata={"id": record.doc_id, **record.metadata},
            collection=record.collection,
        )
    return len(records)


__all__ = ["seed_default_documents"]
