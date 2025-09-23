"""Slugification helpers."""
from __future__ import annotations

import re

_slug_pattern = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    """Convert the provided string into a filesystem-friendly slug."""
    lowered = value.strip().lower()
    slug = _slug_pattern.sub("-", lowered).strip("-")
    return slug or "project"


__all__ = ["slugify"]
