"""Chat router app bootstrap."""
from __future__ import annotations

from typing import Any, List

try:
    from langchain_core.runnables import RunnableConfig  # type: ignore
except Exception:  # pragma: no cover
    RunnableConfig = dict  # type: ignore

from ..workflow.build_app import build_app
from ..workflow.initial_state import initial_state
from .handlers.dispatcher import execute_command
from .intake.llm_message_intake import AnyMessage, LLMMessageIntake


class ChatRouter:
    """High-level chat application that orchestrates intake and command execution."""

    def __init__(self) -> None:
        self._intake = LLMMessageIntake()
        self._core_app = build_app()
        seed_state = initial_state("placeholder goal", "fullstack")
        self._paths = seed_state["paths"] if isinstance(seed_state, dict) else {}

    def run(self, messages: List[AnyMessage], *, thread_id: str = "chat-thread") -> str:
        """Interpret the latest message and execute the resulting command."""
        if not messages:
            raise ValueError("At least one message is required")
        latest = messages[-1]
        history = messages[:-1]
        command = self._intake.interpret(getattr(latest, "content", ""), history, thread_id=thread_id)
        config: RunnableConfig = {"configurable": {"thread_id": thread_id}}  # type: ignore[assignment]
        return execute_command(command, messages, config, self._core_app, self._paths)


__all__ = ["ChatRouter"]
