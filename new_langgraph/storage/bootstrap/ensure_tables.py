"""Ensure storage tables exist."""
from __future__ import annotations

from .. import get_knowledge_store


def ensure_tables() -> None:
    """No-op helper retained for API compatibility."""
    get_knowledge_store()  # Instantiates the in-memory store


__all__ = ["ensure_tables"]
