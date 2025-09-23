"""Retrieve agent persona documents."""
from __future__ import annotations

from .._context import AGENTS_DIR
from ..documents import Document, ensure_yaml_suffix, load_document


def load_agent_persona(name: str) -> Document:
    """Return the structured agent persona document."""
    filename = ensure_yaml_suffix(name)
    return load_document(filename, AGENTS_DIR)


__all__ = ["load_agent_persona"]
