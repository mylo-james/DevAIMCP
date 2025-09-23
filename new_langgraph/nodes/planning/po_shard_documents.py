"""PO shard documents node implementation."""
from __future__ import annotations

from typing import Any, Dict

from ...config import PathConfig
from ...state import BmadState
from ...storage import HybridKnowledgeStore


def po_shard_documents(
    state: BmadState,
    *,
    paths: PathConfig,
    knowledge_store: HybridKnowledgeStore | None = None,
) -> Dict[str, Any]:
    """Populate the story queue with seed backlog items derived from the PRD."""
    if state.get("story_queue"):
        return {}
    prd = state.get("prd")
    if not isinstance(prd, str) or not prd:
        return {}
    lines = [line.strip("- ") for line in prd.splitlines() if line.strip()]
    candidates = [line for line in lines if len(line.split()) > 3][:5]
    story_queue = [
        {
            "id": f"story-{index+1}",
            "title": candidate[:80],
            "status": "draft",
            "filepath": str(paths["stories_root"] / f"story-{index+1}.md"),
        }
        for index, candidate in enumerate(candidates)
    ]
    return {"story_queue": story_queue, "current_story": story_queue[0] if story_queue else None}


__all__ = ["po_shard_documents"]
