"""Load BMAD document assets from disk."""
from __future__ import annotations

from pathlib import Path

from .._context import TASKS_DIR
from ..documents import Document, ensure_yaml_suffix, load_document


def load_markdown(name: str, directory: Path | None = None) -> Document:
    """Load a BMAD document, defaulting to the tasks directory."""
    directory = directory or TASKS_DIR
    filename = ensure_yaml_suffix(name)
    return load_document(filename, directory)


__all__ = ["load_markdown"]
