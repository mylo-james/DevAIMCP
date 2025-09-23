"""Validate sandbox access requests."""
from __future__ import annotations

from pathlib import Path
from typing import Iterable, List


_FORBIDDEN_INTERPRETERS = {"python", "bash", "sh"}


def normalize_paths(paths: Iterable[str]) -> List[Path]:
    """Return normalized Path objects for allowed directories."""
    return [Path(path).resolve() for path in paths]


def ensure_interpreter_allowed(interpreter: str) -> None:
    """Raise when the requested interpreter is forbidden."""
    normalized = interpreter.lower().strip()
    if normalized in _FORBIDDEN_INTERPRETERS:
        raise PermissionError(f"Interpreter '{interpreter}' is not allowed in the sandbox.")


__all__ = ["normalize_paths", "ensure_interpreter_allowed"]
