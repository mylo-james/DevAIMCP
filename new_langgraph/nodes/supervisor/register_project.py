"""Supervisor project registration helpers."""
from __future__ import annotations

from typing import Dict

_PROJECTS: Dict[str, str] = {}


def register_project(thread_id: str | None, project_slug: str) -> None:
    """Record the project slug associated with a thread identifier."""
    if thread_id is None:
        return
    _PROJECTS[thread_id] = project_slug


__all__ = ["register_project"]
