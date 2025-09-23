"""Rendered prompt container."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass
class RenderedPrompt:
    """Container for prompt text and simple metadata."""

    title: str
    body: str
    source: Path


__all__ = ["RenderedPrompt"]
