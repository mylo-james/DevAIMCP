"""Approve architecture node implementation."""
from __future__ import annotations

from typing import Dict

from ...state import BmadState


def approve_architecture(state: BmadState) -> Dict[str, object]:
    """Mark the architecture document as approved if present."""
    if not state.get("architecture"):
        return {}
    approvals = dict(state.get("approvals", {}))
    approvals["architecture"] = "approved"
    return {"approvals": approvals}


__all__ = ["approve_architecture"]
