"""PO validate artifacts node implementation."""
from __future__ import annotations

from typing import Any, Dict

from ...state import BmadState
from ...storage import HybridKnowledgeStore


def po_validate_artifacts(
    state: BmadState,
    *,
    knowledge_store: HybridKnowledgeStore | None = None,
) -> Dict[str, Any]:
    """Record that planning artifacts were reviewed by the product owner."""
    required = ["brief", "prd", "architecture"]
    if not all(state.get(key) for key in required):
        return {}
    review = dict(state.get("artifact_reviews", {}))
    review["po"] = {
        "status": "validated",
        "notes": "Core planning artifacts reviewed.",
    }
    return {"artifact_reviews": review}


__all__ = ["po_validate_artifacts"]
