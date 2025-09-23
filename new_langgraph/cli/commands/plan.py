"""Plan command handler module."""
from __future__ import annotations

import typer

from ...workflow.initial_state import initial_state
from ..runtime.invoke import invoke_with_thread, load_app
from ..runtime.result_logger import handle_result


def register(cli: typer.Typer) -> None:
    """Register the plan command on the shared Typer app."""

    @cli.command(help="Run the planning sequence (Analyst -> PM -> UX -> Architect -> PO).")
    def plan(  # noqa: WPS430 - Typer command signature
        goal: str = typer.Argument(..., help="High-level project goal"),
        project_type: str = typer.Option("fullstack", help="BMAD workflow variant"),
        thread_id: str = typer.Option("bmad-thread", help="LangGraph thread identifier"),
        db_path: str = typer.Option("bmad.db", help="SQLite checkpoint file"),
        checkpointer: str | None = typer.Option(None, help="Override checkpointer backend (sqlite|postgres)"),
    ) -> None:
        app, paths = load_app(db_path, checkpointer)
        state = initial_state(goal, project_type, paths, thread_id=thread_id)
        result = invoke_with_thread(app, state, thread_id)
        handle_result(app, result, thread_id, paths)


__all__ = ["register"]
