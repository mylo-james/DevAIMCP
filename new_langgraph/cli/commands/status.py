"""Status command handler module."""
from __future__ import annotations

import json

import typer

from pathlib import Path

from ..runtime.invoke import load_app


def register(cli: typer.Typer) -> None:
    """Register the status command on the shared Typer app."""

    @cli.command(help="Print the latest persisted state for the thread.")
    def status(  # noqa: WPS430 - Typer command signature
        thread_id: str = typer.Option("bmad-thread", help="LangGraph thread identifier"),
        db_path: str = typer.Option("bmad.db", help="SQLite checkpoint file"),
        checkpointer: str | None = typer.Option(None, help="Override checkpointer backend (sqlite|postgres)"),
    ) -> None:
        app, paths = load_app(db_path, checkpointer)
        config = {"configurable": {"thread_id": thread_id}}
        snapshot = app.get_state(config=config)
        if snapshot is None:
            log_root_value = paths.get("logs_root") if isinstance(paths, dict) else None
            log_root = Path(log_root_value) if log_root_value is not None else Path("logs")
            log_file = log_root / f"{thread_id}.jsonl"
            latest_payload = _read_latest_snapshot(log_file)
            if latest_payload is None:
                typer.echo("No state found for the provided thread.")
                raise typer.Exit(code=1)
            typer.echo(json.dumps(latest_payload, indent=2, ensure_ascii=False))
            return

        typer.echo(json.dumps(snapshot.values, indent=2, ensure_ascii=False))


def _read_latest_snapshot(log_file: Path) -> dict | None:
    if not log_file.exists():
        return None
    try:
        lines = [line.strip() for line in log_file.read_text(encoding="utf-8").splitlines() if line.strip()]
    except OSError:
        return None
    for line in reversed(lines):
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict):
            return data
    return None


__all__ = ["register"]
