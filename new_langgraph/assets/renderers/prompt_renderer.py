"""Render templated prompts using Jinja2."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from .._context import render_template
from ..rendered_prompt import RenderedPrompt


def render_prompt(content: str, variables: dict[str, Any] | None = None, *, title: str = "") -> RenderedPrompt:
    """Render prompt content provided inline."""
    rendered = render_template(content, variables)
    return RenderedPrompt(title=title or "", body=rendered, source=Path("inline"))


__all__ = ["render_prompt"]
