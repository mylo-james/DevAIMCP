"""Next-story command handler."""
from __future__ import annotations

from .. import deps
from ..intake import ChatCommand
from .dispatcher import CommandContext


def handle(command: ChatCommand, context: CommandContext) -> str:
    """Advance the workflow to the next story."""
    result = context.core_app.invoke({}, config=context.core_config)
    return deps.summarize_result(result, context.core_app, context.core_config, action="next_story")


__all__ = ["handle"]
