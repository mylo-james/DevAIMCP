"""Rule-based fallback message interpretation."""
from __future__ import annotations

from typing import Any, Dict, Sequence

from .stringify import stringify_content

ChatCommand = Dict[str, Any]


def fallback_command(user_input: Any) -> ChatCommand:
    """Return a reasonable command when LLM routing fails."""
    text = stringify_content(user_input).strip()
    lowered = text.lower()

    def contains_any(keywords: Sequence[str]) -> bool:
        return any(keyword in lowered for keyword in keywords)

    if contains_any([
        "plan",
        "planning",
        "kick off",
        "start the plan",
        "draft",
    ]):
        goal = text
        for prefix in [
            "plan",
            "please plan",
            "can you plan",
            "could you plan",
            "let's plan",
            "help me plan",
        ]:
            if lowered.startswith(prefix):
                goal = text[len(prefix):].lstrip(" :,-")
                break
        goal = goal or text
        return {"command": "plan", "goal": goal}

    if contains_any([
        "next story",
        "another story",
        "next task",
        "continue story",
    ]):
        return {"command": "next_story"}

    if contains_any(["status", "state", "progress"]):
        return {"command": "status"}

    return {"command": "respond", "message": text}


__all__ = ["fallback_command", "ChatCommand"]
