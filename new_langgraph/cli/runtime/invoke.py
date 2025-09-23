"""Helpers for invoking the LangGraph app from CLI commands."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Tuple

import typer
from langgraph.types import Command

from ...config import default_paths
from ...workflow.build_app import build_app
from ...workflow.tracing_hooks import get_tracing_callbacks


def print_interrupt(result: Any) -> None:
    """Pretty-print an interrupt payload returned by the workflow."""
    typer.echo("\n--- HUMAN INPUT REQUIRED ---")
    payload = getattr(result, "kwargs", None)
    if isinstance(payload, dict):
        payload = payload.get("_interrupt", payload)
    else:
        payload = getattr(result, "value", getattr(result, "__dict__", result))
    typer.echo(json.dumps(payload, indent=2, ensure_ascii=False))
    typer.echo("Use `python -m new_langgraph.cli.app resume --thread-id <id> --data '<json>'` to continue.")


def invoke_with_thread(app: Any, payload: Any, thread_id: str):
    """Invoke the LangGraph app with thread-aware configuration."""
    config: dict[str, Any] = {"configurable": {"thread_id": thread_id}}
    callbacks = get_tracing_callbacks()
    if callbacks:
        config["callbacks"] = callbacks
    return app.invoke(payload, config=config)


def load_app(db_path: str, checkpointer: str | None = None) -> Tuple[Any, dict[str, Any]]:
    """Load the LangGraph workflow application with optional overrides."""
    paths = default_paths()
    original = os.environ.get("BMAD_CHECKPOINTER")
    override_applied = False
    if checkpointer is not None:
        os.environ["BMAD_CHECKPOINTER"] = checkpointer
        override_applied = True
    try:
        app = build_app(paths=paths, db_path=db_path)
    finally:
        if override_applied:
            if original is None:
                os.environ.pop("BMAD_CHECKPOINTER", None)
            else:
                os.environ["BMAD_CHECKPOINTER"] = original
        elif original is not None:
            os.environ["BMAD_CHECKPOINTER"] = original
    return app, paths


__all__ = ["print_interrupt", "invoke_with_thread", "load_app"]
