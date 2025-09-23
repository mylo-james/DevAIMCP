"""Command dispatcher for chat actions."""
from __future__ import annotations

from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from typing import Any, Dict

try:
    from langchain_core.messages import AnyMessage  # type: ignore
except Exception:  # pragma: no cover
    from ..intake.llm_message_intake import AnyMessage  # fallback

try:
    from langchain_core.runnables import RunnableConfig  # type: ignore
except Exception:  # pragma: no cover
    RunnableConfig = Dict[str, Any]  # type: ignore

from .. import deps
from ..intake import ChatCommand

HandlerFn = Callable[[ChatCommand, "CommandContext"], str]


@dataclass(frozen=True)
class CommandContext:
    """Runtime artifacts needed by chat command handlers."""

    history: Sequence[AnyMessage]
    core_app: Any
    paths: Dict[str, Any]
    thread_id: str
    core_config: dict[str, Any]


def execute_command(
    command: ChatCommand,
    history: Iterable[AnyMessage],
    config: RunnableConfig,
    core_app,
    paths: Dict[str, Any],
) -> str:
    """Dispatch a structured command to the appropriate handler."""
    from . import next_story, plan, respond, resume, status

    name = str(command.get("command", "respond")).lower()
    thread_id = config.get("configurable", {}).get("thread_id", "chat-thread") if isinstance(config, dict) else "chat-thread"
    core_config: dict[str, Any] = {"configurable": {"thread_id": thread_id}}

    context = CommandContext(
        history=list(history),
        core_app=core_app,
        paths=paths,
        thread_id=thread_id,
        core_config=core_config,
    )

    handlers: dict[str, HandlerFn] = {
        "respond": respond.handle,
        "plan": plan.handle,
        "next_story": next_story.handle,
        "resume": resume.handle,
        "status": status.handle,
    }
    handler = handlers.get(name, respond.handle)
    return handler(command, context)


__all__ = ["execute_command", "CommandContext"]
