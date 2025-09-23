"""Plan command handler."""
from __future__ import annotations

from .. import deps
from ..intake import ChatCommand
from .dispatcher import CommandContext


def handle(command: ChatCommand, context: CommandContext) -> str:
    """Kick off the planning workflow via the core app."""
    goal = command.get("goal")
    if not goal:
        return "I can start planning once you share a goal. Try: plan an MVP for collaborative notes."
    project_type = command.get("project_type", "fullstack")
    state_input = deps.initial_state_for_chat(
        str(goal),
        str(project_type),
        context.paths,
        thread_id=context.thread_id,
    )
    result = context.core_app.invoke(state_input, config=context.core_config)
    return deps.summarize_result(result, context.core_app, context.core_config, action="plan")


__all__ = ["handle"]
