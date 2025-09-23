"""Status command handler."""
from __future__ import annotations

from .. import deps
from ..intake import ChatCommand
from .dispatcher import CommandContext


def handle(command: ChatCommand, context: CommandContext) -> str:
    """Return the current workflow status."""
    snapshot = context.core_app.get_state(config=context.core_config)
    if not snapshot:
        return "No workflow state yet. Start with: plan <goal>"
    values = snapshot.values if hasattr(snapshot, "values") else snapshot
    if isinstance(values, dict):
        return deps.summarize_status(values)
    return "No structured workflow state available."


__all__ = ["handle"]
