"""Story completion node."""
from __future__ import annotations

from typing import Any, Dict, List

from ...config import PathConfig
from ...state import BmadState
from ...storage import HybridKnowledgeStore
from .shared import story_metadata_snapshot, update_story_outputs


def story_done(
    state: BmadState,
    *,
    paths: PathConfig,
    knowledge_store: HybridKnowledgeStore | None = None,
) -> Dict[str, Any]:
    """Mark the current story as done and rotate the queue."""
    story = state.get("current_story")
    if not isinstance(story, dict) or story.get("status") != "qa_done":
        return {}

    story_id = str(story.get("id", "story"))
    metadata = story_metadata_snapshot(state, story_id)
    metadata.setdefault("status", "done")
    story_outputs = update_story_outputs(state, story_id, metadata)

    queue: List[Dict[str, Any]] = [
        item for item in state.get("story_queue", []) if isinstance(item, dict)
    ]
    remaining = [item for item in queue if item.get("id") != story_id]

    return {
        "story_outputs": story_outputs,
        "story_queue": remaining,
        "current_story": None,
    }


__all__ = ["story_done"]
