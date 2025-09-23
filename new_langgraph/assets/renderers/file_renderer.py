"""Render prompts sourced from files."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from .._context import read_text, render_template
from ..rendered_prompt import RenderedPrompt


def render_from_file(path: Path, variables: dict[str, Any] | None = None) -> RenderedPrompt:
    """Render a prompt template loaded from disk."""
    content = read_text(path)
    rendered = render_template(content, variables)
    return RenderedPrompt(title=path.stem, body=rendered, source=path)


__all__ = ["render_from_file"]
