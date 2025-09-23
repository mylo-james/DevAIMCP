"""Search command handler module."""
from __future__ import annotations

import json

import typer

from ...storage import get_knowledge_store


def register(cli: typer.Typer) -> None:
    """Register the search command on the shared Typer app."""

    @cli.command(help="Query the knowledge store using vector, keyword, or hybrid search.")
    def search(  # noqa: WPS430 - Typer command signature
        query: str = typer.Argument(..., help="Search string"),
        collection: str = typer.Option("documents", help="Collection to query"),
        limit: int = typer.Option(5, help="Number of results"),
        mode: str = typer.Option("hybrid", help="Search mode: hybrid|vector|keyword"),
    ) -> None:
        store = get_knowledge_store()
        if store is None:
            typer.echo("Knowledge store unavailable. Check PG_CONNECTION_STRING or database status.")
            raise typer.Exit(code=1)
        mode_normalized = mode.lower()
        if mode_normalized == "vector":
            results = store.vector_search(query, collection=collection, limit=limit)
        elif mode_normalized == "keyword":
            results = store.keyword_search(query, collection=collection, limit=limit)
        else:
            results = store.search(query, collection=collection, limit=limit)
        if not results:
            typer.echo("No results found.")
            return
        for idx, result in enumerate(results, start=1):
            typer.echo(f"\nResult {idx} [{result.mode}] score={result.score:.4f}")
            typer.echo(result.content[:500])
            if result.metadata:
                typer.echo(f"Metadata: {json.dumps(result.metadata, ensure_ascii=False)}")


__all__ = ["register"]
