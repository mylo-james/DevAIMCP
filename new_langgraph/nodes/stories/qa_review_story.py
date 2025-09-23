"""QA review story node."""
from __future__ import annotations

from typing import Any, Dict

from ...agents.registry import generate_response
from ...config import PathConfig
from ...state import BmadState
from ...storage import HybridKnowledgeStore


def qa_review_story(
    state: BmadState,
    *,
    paths: PathConfig,
    knowledge_store: HybridKnowledgeStore | None = None,
) -> Dict[str, Any]:
    """Produce QA notes for the current story when in review."""
    story = state.get("current_story")
    if not isinstance(story, dict) or story.get("status") != "review":
        return {}

    prompt = (
        "You are QA. Provide validation focus, edge cases, and regression concerns.\n"
        f"Story title: {story.get('title', 'Untitled')}\n"
        f"Dev notes: {story.get('dev_plan_path', '(not generated yet)')}"
    )
    qa_notes = generate_response("qa", prompt, story=story)

    updated = dict(story)
    updated["qa_notes"] = qa_notes
    updated["status"] = "qa_review"
    return {"current_story": updated}


__all__ = ["qa_review_story"]
