"""Executor factory wrappers for sandbox shells."""
from __future__ import annotations

from pathlib import Path
from typing import Iterable

from ...agents.tools.shell_tool import LocalShellTool


def build_restricted_executor(paths: Iterable[str]) -> LocalShellTool:
    """Create a LocalShellTool configured with the allowed paths."""
    return LocalShellTool(Path(path) for path in paths)


__all__ = ["build_restricted_executor"]
