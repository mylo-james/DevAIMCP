"""State-machine router helpers for story progression."""
from __future__ import annotations

from ..state import BmadState


def scrum_master_router(state: BmadState) -> str:
    """Route Scrum Master node execution based on story state."""
    if state.get("workflow_complete"):
        return "complete"
    if state.get("current_story"):
        return "has_story"
    return "noop"


__all__ = ["scrum_master_router"]
