"""Retrieval selector utilities."""
from __future__ import annotations

from typing import Iterable


def first_non_empty(strings: Iterable[str]) -> str:
    """Return the first non-empty string from an iterable."""
    for value in strings:
        if value:
            return value
    return ""


__all__ = ["first_non_empty"]
