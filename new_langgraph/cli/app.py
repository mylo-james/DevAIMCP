"""Entry point wiring Typer CLI commands together."""
from __future__ import annotations

import typer

from .commands import ingest, init_db, lg, next_story, plan, resume, search, status

cli = typer.Typer(help="BMAD LangGraph workflow runner")

for register in (
    plan.register,
    next_story.register,
    resume.register,
    status.register,
    ingest.register,
    search.register,
    init_db.register,
    lg.register,
):
    register(cli)


__all__ = ["cli"]
