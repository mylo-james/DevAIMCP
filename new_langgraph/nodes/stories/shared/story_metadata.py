"""Story metadata helpers."""
from __future__ import annotations

from typing import Any, Dict

from ....state import BmadState


def story_metadata_snapshot(state: BmadState, story_id: str) -> Dict[str, Any]:
    """Return a metadata snapshot for a story from the workflow state."""
    outputs = state.get("story_outputs") or {}
    existing = outputs.get(story_id, {}) if isinstance(outputs, dict) else {}
    snapshot = dict(existing)
    story = state.get("current_story") or {}
    if isinstance(story, dict):
        snapshot.setdefault("story_id", story_id)
        snapshot.setdefault("title", story.get("title"))
        snapshot.setdefault("status", story.get("status"))
    return snapshot


def update_story_outputs(state: BmadState, story_id: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Update the story_outputs map with the provided metadata."""
    outputs = state.get("story_outputs") or {}
    if not isinstance(outputs, dict):
        outputs = {}
    updated = dict(outputs)
    updated[story_id] = metadata
    return updated


__all__ = ["story_metadata_snapshot", "update_story_outputs"]
