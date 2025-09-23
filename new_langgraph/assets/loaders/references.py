"""Access reference BMAD documents."""
from __future__ import annotations

from pathlib import Path

from ..documents import Document, load_document_from_path


def load_reference_markdown(path: Path) -> Document:
    """Load an arbitrary BMAD document located under the library tree."""
    return load_document_from_path(path)


__all__ = ["load_reference_markdown"]
