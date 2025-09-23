"""Expose the LangGraph graph via a repo-local import shim.

This lets ``langgraph dev`` run from the ``new_langgraph`` directory without
additional PYTHONPATH configuration by ensuring the repository root is on
``sys.path`` before the actual package import happens.
"""
from __future__ import annotations

import os
import sys
from functools import cache
from pathlib import Path


@cache
def _ensure_repo_on_path() -> None:
    """Insert the repository root onto ``sys.path`` exactly once."""
    here = Path(__file__).resolve().parent
    repo_root = here.parent
    repo_str = str(repo_root)
    if repo_str not in sys.path:
        sys.path.insert(0, repo_str)


_ensure_repo_on_path()


@cache
def _load_env_files() -> None:
    """Populate process env vars from repo-local ``.env`` files if present."""
    candidates = (
        Path(__file__).resolve().parent / ".env",
        Path(__file__).resolve().parent.parent / ".env",
    )
    for env_file in candidates:
        if not env_file.exists():
            continue
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


_load_env_files()

from new_langgraph.workflow.graph import graph  # noqa: E402  (import after path fix)

__all__ = ["graph"]
