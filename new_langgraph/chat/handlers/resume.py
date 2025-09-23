"""Resume command handler."""
from __future__ import annotations

try:
    from langgraph.types import Command  # type: ignore
except Exception:  # pragma: no cover
    from ..deps import Command  # fallback stub

from .. import deps
from ..intake import ChatCommand
from .dispatcher import CommandContext


def handle(command: ChatCommand, context: CommandContext) -> str:
    """Resume the workflow with user-provided payload."""
    payload = command.get("resume_payload") or {}
    if not isinstance(payload, dict):
        return 'Resume expects JSON data, for example: resume {"approve": true}'
    result = context.core_app.invoke(Command(resume=payload), config=context.core_config)
    return deps.summarize_result(result, context.core_app, context.core_config, action="resume")


__all__ = ["handle"]
