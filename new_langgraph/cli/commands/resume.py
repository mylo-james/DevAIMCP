"""Resume command handler module."""
from __future__ import annotations

import json

import typer
from langgraph.types import Command

from ..runtime.invoke import invoke_with_thread, load_app
from ..runtime.result_logger import handle_result


def register(cli: typer.Typer) -> None:
    """Register the resume command on the shared Typer app."""

    @cli.command(help="Resume the graph with data captured from a prior interrupt.")
    def resume(  # noqa: WPS430 - Typer command signature
        data: str = typer.Option("{}", help="JSON payload returned from interrupt"),
        thread_id: str = typer.Option("bmad-thread", help="LangGraph thread identifier"),
        db_path: str = typer.Option("bmad.db", help="SQLite checkpoint file"),
        checkpointer: str | None = typer.Option(None, help="Override checkpointer backend (sqlite|postgres)"),
    ) -> None:
        app, paths = load_app(db_path, checkpointer)
        try:
            payload = json.loads(data)
        except json.JSONDecodeError as exc:
            typer.echo(f"Invalid JSON payload: {exc}")
            raise typer.Exit(code=1) from exc
        result = invoke_with_thread(app, Command(resume=payload), thread_id)
        handle_result(app, result, thread_id, paths)


__all__ = ["register"]
