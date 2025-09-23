"""Smalltalk response handler."""
from __future__ import annotations

from typing import Any

from .. import deps
from ..intake import ChatCommand
from .dispatcher import CommandContext


def handle(command: ChatCommand, context: CommandContext) -> str:
    """Respond to a conversational turn using the smalltalk agent."""
    message = command.get("message")
    if not message and context.history:
        message = getattr(context.history[-1], "content", "")
    return deps.generate_response("smalltalk", str(message or ""), thread_id=context.thread_id)


__all__ = ["handle"]
