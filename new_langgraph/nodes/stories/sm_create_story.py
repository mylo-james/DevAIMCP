"""Scrum master create story node."""
from __future__ import annotations

from typing import Any, Dict, List

from ...config import PathConfig
from ...state import BmadState
from ...storage import HybridKnowledgeStore


def sm_create_story(
    state: BmadState,
    *,
    paths: PathConfig,
    knowledge_store: HybridKnowledgeStore | None = None,
) -> Dict[str, Any]:
    """Select the next story from the queue or mark the workflow complete."""
    queue: List[Dict[str, Any]] = [
        item for item in state.get("story_queue", []) if isinstance(item, dict)
    ]
    current = state.get("current_story")
    if current and isinstance(current, dict) and current.get("status") not in {"review", "done"}:
        return {}
    if queue:
        next_story = queue[0]
        next_story.setdefault("status", "draft")
        return {"current_story": next_story, "workflow_complete": False}
    return {"current_story": None, "workflow_complete": True}


__all__ = ["sm_create_story"]
