"""Tracing callback registration utilities."""
from __future__ import annotations

from typing import Any


def get_tracing_callbacks() -> list[Any] | None:
    """Return tracing callbacks if tracing is enabled; None otherwise."""
    return None


__all__ = ["get_tracing_callbacks"]
