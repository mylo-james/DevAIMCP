"""Workflow profile loading utilities."""
from __future__ import annotations

from typing import Any

from ..assets import AssetMissingError, load_yaml
from ..config import BMAD_CORE_DIR


def load_workflow_profile(project_type: str) -> dict[str, Any] | None:
    """Load the workflow profile YAML that best matches the project type."""
    tokens = {token for token in project_type.lower().replace("-", " ").split() if token}
    if "brownfield" in tokens:
        if {"service", "api", "backend"} & tokens:
            filename = "brownfield-service.yaml"
        elif {"ui", "frontend"} & tokens:
            filename = "brownfield-ui.yaml"
        else:
            filename = "brownfield-fullstack.yaml"
    else:
        if {"service", "api", "backend"} & tokens:
            filename = "greenfield-service.yaml"
        elif {"ui", "frontend"} & tokens:
            filename = "greenfield-ui.yaml"
        else:
            filename = "greenfield-fullstack.yaml"

    workflows_dir = BMAD_CORE_DIR / "workflows"
    try:
        profile = load_yaml(filename, directory=workflows_dir)
    except AssetMissingError:
        return None
    if isinstance(profile, dict):
        profile["source"] = filename
    return profile


__all__ = ["load_workflow_profile"]
