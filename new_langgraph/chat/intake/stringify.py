"""Helpers for flattening message payload content."""
from __future__ import annotations

import json
from typing import Any


def stringify_content(value: Any) -> str:
    """Convert LangChain message payloads into plain text."""
    if isinstance(value, str):
        return value
    if value is None:
        return ""
    if isinstance(value, dict):
        if isinstance(value.get("text"), str):
            return value["text"]
        if value.get("type") == "input_text" and isinstance(value.get("text"), str):
            return value["text"]
        if "content" in value:
            inner = stringify_content(value["content"])
            if inner:
                return inner
        try:
            return json.dumps(value, ensure_ascii=False)
        except (TypeError, ValueError):
            return str(value)
    if isinstance(value, list):
        parts = [stringify_content(item) for item in value]
        return " ".join(part for part in parts if part)
    try:
        return str(value)
    except Exception:  # pragma: no cover
        return ""


__all__ = ["stringify_content"]
