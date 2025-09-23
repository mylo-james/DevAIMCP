"""Resolve sandbox access policies."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List

from .validators import ensure_interpreter_allowed, normalize_paths


@dataclass(slots=True)
class SandboxPolicy:
    """Represents an evaluated sandbox policy."""

    interpreter: str
    allowed_paths: List[Path]


def resolve_policy(interpreter: str, paths: Iterable[str]) -> SandboxPolicy:
    """Validate the interpreter and normalize allowed paths."""
    ensure_interpreter_allowed(interpreter)
    return SandboxPolicy(interpreter=interpreter, allowed_paths=normalize_paths(paths))


__all__ = ["SandboxPolicy", "resolve_policy"]
