"""Persist rendered documents to disk."""
from __future__ import annotations

from pathlib import Path

from ...config import ensure_dirs


def write_doc(path: Path, content: str) -> None:
    """Write the provided content to disk, creating parent directories as needed."""
    ensure_dirs(path.parent)
    path.write_text(content, encoding="utf-8")


__all__ = ["write_doc"]
