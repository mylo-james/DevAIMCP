"""Utilities for persisting CLI run results."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping

import typer
from langgraph.types import Command

from .invoke import print_interrupt


def handle_result(app: Any, result: Any, thread_id: str, paths: Mapping[str, Any]) -> None:
    """Log workflow state updates or surface interrupts to the user."""
    if hasattr(result, "type") and getattr(result, "type") == "interrupt":
        print_interrupt(result)
        return
    if isinstance(result, Command):
        print_interrupt(result)
        return

    config = {"configurable": {"thread_id": thread_id}}
    snapshot = app.get_state(config=config)
    if snapshot is None:
        typer.echo("No state captured for the requested thread.")
        return

    typer.echo("\n--- STATE UPDATED ---")
    typer.echo(json.dumps(snapshot.values, indent=2, ensure_ascii=False))

    log_root_value = paths.get("logs_root")
    log_root = Path(log_root_value)
    log_root.mkdir(parents=True, exist_ok=True)
    log_file = log_root / f"{thread_id}.jsonl"
    with log_file.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(snapshot.values, ensure_ascii=False) + "\n")


__all__ = ["handle_result"]
