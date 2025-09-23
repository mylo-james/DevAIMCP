"""Path configuration helpers."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from typing_extensions import TypedDict

BASE_DIR = Path(__file__).resolve().parent.parent
"""Repository-relative directory that anchors configuration lookups."""

BMAD_CORE_DIR = BASE_DIR / "lib"
"""Directory containing BMAD templates, checklists, and reference assets."""

_PROJECT_ROOT_ENV_VARS = ("BMAD_PROJECT_ROOT", "LANGGRAPH_PROJECT_ROOT")
"""Environment variables that may override the active BMAD project root."""


class PathConfig(TypedDict):
    """Named filesystem locations consumed by the LangGraph workflow."""

    docs_root: Path
    prd: Path
    architecture: Path
    stories_root: Path
    epics_root: Path
    qa_root: Path
    qa_assessments: Path
    qa_gates: Path
    logs_root: Path


_CORE_CONFIG_CACHE: dict[str, Any] | None = None


def _resolve_project_root() -> Path:
    """Determine the project root directory for generated documentation."""

    for env_var in _PROJECT_ROOT_ENV_VARS:
        value = os.environ.get(env_var)
        if not value:
            continue
        candidate = Path(value).expanduser()
        if not candidate.is_absolute():
            candidate = Path.cwd() / candidate
        return candidate.resolve()

    cwd = Path.cwd().resolve()
    if (cwd / "docs").exists():
        return cwd

    return BASE_DIR


def _resolve_core_path(value: str | None, *, project_root: Path) -> Path:
    """Resolve a path reference from the core configuration file."""
    if not value:
        return project_root / "docs"
    candidate = Path(value)
    if not candidate.is_absolute():
        candidate = project_root / candidate
    return candidate.resolve()


def _load_core_config() -> dict[str, Any]:
    """Load the reusable YAML config shipped with the BMAD knowledge base."""
    global _CORE_CONFIG_CACHE
    if _CORE_CONFIG_CACHE is not None:
        return _CORE_CONFIG_CACHE

    config_path = BMAD_CORE_DIR / "core-config.yaml"
    if config_path.exists():
        with config_path.open("r", encoding="utf-8") as handle:
            _CORE_CONFIG_CACHE = yaml.safe_load(handle) or {}
    else:
        _CORE_CONFIG_CACHE = {}
    return _CORE_CONFIG_CACHE


def default_paths(project_root: Path | None = None) -> PathConfig:
    """Produce the default set of filesystem paths for the workflow."""

    resolved_root = project_root.resolve() if project_root else _resolve_project_root()
    docs_root = (resolved_root / "docs").resolve()

    core_cfg = _load_core_config()

    prd_file = core_cfg.get("prd", {}).get("prdFile") if core_cfg else None
    if prd_file:
        prd_path = _resolve_core_path(prd_file, project_root=resolved_root)
        docs_root = prd_path.parent
    else:
        prd_path = docs_root / "prd.md"

    architecture_file = core_cfg.get("architecture", {}).get("architectureFile") if core_cfg else None
    if architecture_file:
        architecture_path = _resolve_core_path(architecture_file, project_root=resolved_root)
    else:
        architecture_path = docs_root / "architecture.md"

    qa_location = core_cfg.get("qa", {}).get("qaLocation") if core_cfg else None
    qa_root = (
        _resolve_core_path(qa_location, project_root=resolved_root)
        if qa_location
        else docs_root / "qa"
    )

    return {
        "docs_root": docs_root,
        "prd": prd_path,
        "architecture": architecture_path,
        "stories_root": docs_root / "stories",
        "epics_root": docs_root / "epics",
        "qa_root": qa_root,
        "qa_assessments": qa_root / "assessments",
        "qa_gates": qa_root / "gates",
        "logs_root": resolved_root / "logs",
    }


__all__ = [
    "BASE_DIR",
    "BMAD_CORE_DIR",
    "PathConfig",
    "default_paths",
]
