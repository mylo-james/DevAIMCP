"""List and load agent team configurations."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Iterable

import yaml

from .._context import AGENT_TEAMS_DIR, read_text


def list_agent_teams() -> Iterable[Path]:
    """Iterate over available agent team YAML definitions."""
    if not AGENT_TEAMS_DIR.exists():
        return []
    return sorted(AGENT_TEAMS_DIR.glob("*.yaml"))


def load_agent_team(name: str) -> dict[str, Any]:
    """Load a specific agent team configuration by filename or stem."""
    filename = name
    if not filename.endswith(".yaml") and not filename.endswith(".yml"):
        filename = f"{name}.yaml"
    path = AGENT_TEAMS_DIR / filename
    content = read_text(path)
    return yaml.safe_load(content)


__all__ = ["list_agent_teams", "load_agent_team"]
