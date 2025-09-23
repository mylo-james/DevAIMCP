"""PO story review node."""
from __future__ import annotations

from typing import Any, Dict

from ...agents.registry import generate_response
from ...config import PathConfig
from ...state import BmadState
from ...storage import HybridKnowledgeStore


def po_story_review(
    state: BmadState,
    *,
    paths: PathConfig,
    knowledge_store: HybridKnowledgeStore | None = None,
) -> Dict[str, Any]:
    """Review the current story and add acceptance notes."""
    story = state.get("current_story")
    if not isinstance(story, dict) or story.get("status") not in {"draft", "approved"}:
        return {}
    prompt = (
        "You are the Product Owner. Review the story and outline acceptance notes.\n"
        f"Story title: {story.get('title', 'Untitled')}\n"
        f"Current status: {story.get('status', 'draft')}\n"
        "Return bullet points for acceptance, dependencies, and clarifications."
    )
    notes = generate_response("po", prompt, story=story)
    story_review = dict(story)
    story_review["po_notes"] = notes
    story_review["status"] = "approved"
    return {"current_story": story_review}


__all__ = ["po_story_review"]
