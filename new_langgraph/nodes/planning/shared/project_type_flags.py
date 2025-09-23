"""Project type flag helpers."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True, frozen=True)
class ProjectTypeFlags:
    """Feature flags inferred from the project type string."""

    is_brownfield: bool
    emphasizes_backend: bool
    emphasizes_frontend: bool


_BACKEND_TOKENS = {"service", "api", "backend"}
_FRONTEND_TOKENS = {"frontend", "ui", "ux"}


def project_type_flags(project_type: str | None) -> ProjectTypeFlags:
    """Interpret the project type string and return derived flags."""
    tokens = {token for token in (project_type or "").lower().replace("-", " ").split() if token}
    return ProjectTypeFlags(
        is_brownfield="brownfield" in tokens,
        emphasizes_backend=bool(_BACKEND_TOKENS & tokens),
        emphasizes_frontend=bool(_FRONTEND_TOKENS & tokens),
    )


__all__ = ["ProjectTypeFlags", "project_type_flags"]
