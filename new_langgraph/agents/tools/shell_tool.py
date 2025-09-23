"""Shell tool adapter wiring."""
from __future__ import annotations

import shlex
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List


def _is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


@dataclass(slots=True)
class LocalShellCommandRequest:
    """Command request describing executable and working directory."""

    command: str
    cwd: Path | None = None


class LocalShellTool:
    """Very small wrapper that executes shell commands within allowed directories."""

    def __init__(self, allowed_paths: Iterable[Path]) -> None:
        self._allowed = [path.resolve() for path in allowed_paths]

    def run(self, request: LocalShellCommandRequest) -> str:
        cwd = request.cwd.resolve() if request.cwd else None
        if cwd and not any(cwd == allowed or _is_relative_to(cwd, allowed) for allowed in self._allowed):
            raise PermissionError(f"Directory {cwd} not allowed for shell execution.")
        args: List[str] = shlex.split(request.command)
        result = subprocess.run(
            args,
            cwd=str(cwd) if cwd else None,
            capture_output=True,
            text=True,
            check=False,
        )
        output = result.stdout.strip()
        if result.stderr:
            stderr = result.stderr.strip()
            output = f"{output}\n{stderr}" if output else stderr
        if result.returncode != 0:
            raise RuntimeError(f"Command failed with exit code {result.returncode}: {output}")
        return output


__all__ = ["LocalShellTool", "LocalShellCommandRequest"]
