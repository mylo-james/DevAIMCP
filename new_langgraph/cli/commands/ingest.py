"""Ingest command handler module."""
from __future__ import annotations

import json
from pathlib import Path

import typer

from ...storage import get_knowledge_store


def register(cli: typer.Typer) -> None:
    """Register the ingest command on the shared Typer app."""

    @cli.command(help="Add a document to the hybrid knowledge store.")
    def ingest(  # noqa: WPS430 - Typer command signature
        path: Path | None = typer.Option(None, help="Path to a document to ingest"),
        text_input: str | None = typer.Option(None, "--text", help="Raw text to ingest"),
        collection: str = typer.Option("documents", help="Target collection name"),
        metadata: str = typer.Option("{}", help="JSON metadata"),
    ) -> None:
        store = get_knowledge_store()
        if store is None:
            typer.echo("Knowledge store unavailable. Check PG_CONNECTION_STRING or database status.")
            raise typer.Exit(code=1)
        if not path and not text_input:
            typer.echo("Provide either --path or --text to ingest content.")
            raise typer.Exit(code=1)
        if path and text_input:
            typer.echo("Use either --path or --text, not both.")
            raise typer.Exit(code=1)
        if path:
            content = Path(path).read_text(encoding="utf-8")
        else:
            content = text_input or ""
        try:
            meta = json.loads(metadata)
        except json.JSONDecodeError as exc:
            typer.echo(f"Invalid metadata JSON: {exc}")
            raise typer.Exit(code=1) from exc
        doc_id = store.add_document(content, metadata=meta, collection=collection)
        typer.echo(f"Stored document {doc_id} in collection '{collection}'.")


__all__ = ["register"]
