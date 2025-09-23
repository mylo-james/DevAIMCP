"""LLM-backed message intake implementation."""
from __future__ import annotations

import json
import textwrap
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any, Protocol

try:
    from langchain_core.messages import AnyMessage  # type: ignore
except Exception:  # pragma: no cover
    @dataclass
    class AnyMessage:  # type: ignore
        """Fallback message representation."""

        type: str
        content: Any

from .. import deps
from .fallback import ChatCommand, fallback_command
from .stringify import stringify_content


class MessageIntake(Protocol):
    """Translate conversational input into structured chat commands."""

    def interpret(
        self,
        user_input: str,
        history: Sequence[AnyMessage],
        *,
        thread_id: str | None = None,
    ) -> ChatCommand:
        ...


class LLMMessageIntake(MessageIntake):
    """Route messages through the chat-router agent to obtain commands."""

    def __init__(self, *, default_project_type: str = "fullstack") -> None:
        self.default_project_type = default_project_type

    def interpret(
        self,
        user_input: str,
        history: Sequence[AnyMessage],
        *,
        thread_id: str | None = None,
    ) -> ChatCommand:
        prompt = textwrap.dedent(
            """
            You translate chat messages into JSON commands for the workflow.
            Respond with a JSON object only. Example:
            {
              "command": "plan",
              "goal": "Ship an onboarding flow",
              "project_type": "fullstack",
              "resume_payload": {},
              "message": ""
            }
            The "command" value must be one of ["plan", "next_story", "resume", "status", "respond"].
            Include keys only when they apply.
            """
        ).strip()
        history_snippets = "\n".join(
            f"{msg.type}: {stringify_content(getattr(msg, 'content', ''))}"
            for msg in deps.history_tail(history)
        )
        payload_prompt = (
            f"Conversation so far:\n{history_snippets}\n\n"
            f"Latest user message:\n{stringify_content(user_input)}\n\n"
            "Return ONLY the JSON object."
        )
        try:
            response = deps.generate_response(
                "chat_router",
                f"{prompt}\n\n{payload_prompt}",
                workflow="chat_router",
                thread_id=thread_id,
            )
            data = json.loads(response)
            if isinstance(data, dict) and "command" in data:
                command = data
            else:
                raise ValueError("Router returned invalid payload")
        except Exception:
            command = fallback_command(user_input)

        command.setdefault("command", "respond")
        command.setdefault("project_type", self.default_project_type)
        return command


__all__ = ["LLMMessageIntake", "MessageIntake"]
