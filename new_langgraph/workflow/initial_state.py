"""Initial state construction for workflow runs."""
from __future__ import annotations

from typing import Any

from ..config import PathConfig, default_paths
from ..nodes.supervisor.register_project import register_project
from ..utils import slugify
from .profile_loader import load_workflow_profile


def initial_state(
    goal: str,
    project_type: str = "fullstack",
    paths: PathConfig | None = None,
    *,
    thread_id: str | None = None,
) -> dict[str, Any]:
    """Assemble the initial LangGraph state payload for a new workflow run."""
    path_config = paths or default_paths()
    workflow_profile = load_workflow_profile(project_type)
    project_slug = slugify(goal)
    register_project(thread_id, project_slug)
    state: dict[str, Any] = {
        "goal": goal,
        "project_type": project_type,
        "paths": {key: str(value) for key, value in path_config.items()},
        "brief": "",
        "prd": "",
        "ux_spec": None,
        "architecture": "",
        "story_queue": [],
        "current_story": None,
        "story_outputs": {},
        "qa_artifacts": {},
        "qa_gate": {},
        "notes": [],
        "errors": [],
        "workflow_complete": False,
        "project_slug": project_slug,
        "thread_id": thread_id,
    }
    if workflow_profile:
        state["workflow_profile"] = workflow_profile
    return state


__all__ = ["initial_state"]
