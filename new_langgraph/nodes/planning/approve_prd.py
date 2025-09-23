"""Approve PRD node implementation."""
from __future__ import annotations

from typing import Dict

from ...state import BmadState


def approve_prd(state: BmadState) -> Dict[str, object]:
    """Mark the PRD as approved if it exists."""
    if not state.get("prd"):
        return {}
    approvals = dict(state.get("approvals", {}))
    approvals["prd"] = "approved"
    return {"approvals": approvals}


__all__ = ["approve_prd"]
