"""Shared context utilities for asset loading and rendering."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from jinja2 import BaseLoader, Environment

from ..config import BMAD_CORE_DIR
from .errors import AssetMissingError

TEMPLATES_DIR = BMAD_CORE_DIR / "templates"
TASKS_DIR = BMAD_CORE_DIR / "tasks"
DATA_DIR = BMAD_CORE_DIR / "data"
CHECKLISTS_DIR = BMAD_CORE_DIR / "checklists"
AGENTS_DIR = BMAD_CORE_DIR / "agents"
AGENT_TEAMS_DIR = BMAD_CORE_DIR / "agent-teams"
UTILS_DIR = BMAD_CORE_DIR / "utils"

_env = Environment(loader=BaseLoader(), autoescape=False, trim_blocks=True, lstrip_blocks=True)


def read_text(path: Path) -> str:
    """Read UTF-8 content or raise when the asset is missing."""
    if not path.exists():
        raise AssetMissingError(f"Missing BMAD asset: {path}")
    return path.read_text(encoding="utf-8")


def render_template(content: str, variables: dict[str, Any] | None = None) -> str:
    """Render the provided template string with the supplied variables."""
    template = _env.from_string(content)
    return template.render(variables or {})


__all__ = [
    "TEMPLATES_DIR",
    "TASKS_DIR",
    "DATA_DIR",
    "CHECKLISTS_DIR",
    "AGENTS_DIR",
    "AGENT_TEAMS_DIR",
    "UTILS_DIR",
    "read_text",
    "render_template",
]
