"""Construct sandbox shell tools."""
from __future__ import annotations

from typing import Iterable

from ...agents.tools.shell_tool import LocalShellTool
from .allowed_paths_key import allowed_paths_key
from .executor_factory import build_restricted_executor


def build_shell_tool(paths: Iterable[str]) -> tuple[tuple[str, ...], LocalShellTool | None]:
    """Return the allowed-path key and configured shell tool."""
    key = allowed_paths_key(paths)
    if not key:
        return key, None
    executor = build_restricted_executor(key[1:])
    return key, executor


__all__ = ["build_shell_tool", "allowed_paths_key"]
