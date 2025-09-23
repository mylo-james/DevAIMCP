"""QA gate update node."""
from __future__ import annotations

from typing import Any, Dict

from ...config import PathConfig
from ...state import BmadState
from ...storage import HybridKnowledgeStore


def qa_gate_update(
    state: BmadState,
    *,
    paths: PathConfig,
    knowledge_store: HybridKnowledgeStore | None = None,
) -> Dict[str, Any]:
    """Update QA gate status once QA review completes."""
    story = state.get("current_story")
    if not isinstance(story, dict) or story.get("status") != "qa_review":
        return {}

    qa_gate = dict(state.get("qa_gate", {}))
    qa_gate[story.get("id", "story")] = {
        "status": "ready_for_release",
        "notes": story.get("qa_notes", ""),
    }
    updated = dict(story)
    updated["status"] = "qa_done"
    return {"qa_gate": qa_gate, "current_story": updated}


__all__ = ["qa_gate_update"]
