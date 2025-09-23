"""Filesystem ensure/create helpers."""
from __future__ import annotations

from pathlib import Path


def ensure_dirs(*paths: Path) -> None:
    """Create each directory if it does not already exist."""
    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


__all__ = ["ensure_dirs"]
