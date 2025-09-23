"""Next-story command handler module."""
from __future__ import annotations

import typer

from ..runtime.invoke import invoke_with_thread, load_app
from ..runtime.result_logger import handle_result


def register(cli: typer.Typer) -> None:
    """Register the next-story command on the shared Typer app."""

    @cli.command("next-story", help="Advance the workflow to create and plan the next story.")
    def next_story(  # noqa: WPS430 - Typer command signature
        thread_id: str = typer.Option("bmad-thread", help="LangGraph thread identifier"),
        db_path: str = typer.Option("bmad.db", help="SQLite checkpoint file"),
        checkpointer: str | None = typer.Option(None, help="Override checkpointer backend (sqlite|postgres)"),
    ) -> None:
        app, paths = load_app(db_path, checkpointer)
        result = invoke_with_thread(app, {}, thread_id)
        handle_result(app, result, thread_id, paths)


__all__ = ["register"]
