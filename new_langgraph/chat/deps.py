"""Chat-layer dependency adapters."""
from __future__ import annotations

from typing import Any, Iterable

try:
    from langgraph.types import Command  # type: ignore
except Exception:  # pragma: no cover
    class Command:  # type: ignore
        """Fallback command stub used when langgraph is unavailable."""

        def __init__(self, **kwargs: Any) -> None:
            self.kwargs = kwargs


from ..agents.registry import generate_response as generate_agent_response
from ..workflow.build_app import build_app
from ..workflow.initial_state import initial_state


def generate_response(agent: str, prompt: str, **context: Any) -> str:
    """Delegate response generation to the agent registry."""
    return generate_agent_response(agent, prompt, **context)


def initial_state_for_chat(goal: str, project_type: str, paths, thread_id: str) -> dict[str, Any]:
    """Wrapper for constructing the initial workflow state."""
    return initial_state(goal, project_type, paths, thread_id=thread_id)


def summarize_result(result: Any, app: Any, config: dict[str, Any], *, action: str) -> str:
    """Return a friendly summary for the command outcome."""
    if isinstance(result, Command):
        return "Workflow paused for human input."
    snapshot = app.get_state(config=config) if hasattr(app, "get_state") else None
    if not snapshot:
        return f"No state available after {action}."
    values = snapshot.values if hasattr(snapshot, "values") else snapshot
    if isinstance(values, dict) and values.get("brief"):
        return values["brief"][:500]
    return f"Workflow action '{action}' completed."


def summarize_status(values: dict[str, Any]) -> str:
    """Format stored workflow status for chat replies."""
    sections = [
        f"Goal: {values.get('goal', '(unset)')}",
        f"Project type: {values.get('project_type', '(unset)')}",
        f"Stories queued: {len(values.get('story_queue', []))}",
        f"Current story: {values.get('current_story', {}).get('title', '(none)') if isinstance(values.get('current_story'), dict) else '(none)'}",
    ]
    return "\n".join(sections)


def build_core_app(**kwargs: Any) -> Any:
    """Expose the core workflow app builder to chat handlers."""
    return build_app(**kwargs)


def history_tail(history: Iterable[Any], *, limit: int = 4) -> list[Any]:
    """Return the latest messages for prompt context."""
    items = list(history)
    return items[-limit:]


__all__ = [
    "generate_response",
    "initial_state_for_chat",
    "summarize_result",
    "summarize_status",
    "build_core_app",
    "history_tail",
]
