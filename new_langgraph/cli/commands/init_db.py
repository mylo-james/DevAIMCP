"""Init-db command handler module."""
from __future__ import annotations

from pathlib import Path

import typer
from sqlalchemy import create_engine, text

from ...config import database_config


def register(cli: typer.Typer) -> None:
    """Register the init-db command on the shared Typer app."""

    @cli.command("init-db", help="Run SQL initialization against the configured Postgres database.")
    def init_db(  # noqa: WPS430 - Typer command signature
        sql_file: Path = typer.Option(Path("scripts/init_db.sql"), exists=True, help="SQL file to execute"),
    ) -> None:
        cfg = database_config()
        engine = create_engine(cfg.url, future=True)
        statements = sql_file.read_text(encoding="utf-8")
        with engine.begin() as connection:
            for statement in statements.split(";"):
                stmt = statement.strip()
                if stmt:
                    connection.execute(text(stmt))
        typer.echo(f"Executed initialization SQL against {cfg.url}.")


__all__ = ["register"]
