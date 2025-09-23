"""Typer commands for the YAML-driven LangGraph runtime."""
from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any, Mapping

import typer

from ...yaml_runtime.run import (
    RunOptions,
    export_json_schema,
    run_workflow,
    validate_package,
    workflow_graphviz,
)


def register(cli: typer.Typer) -> None:
    app = typer.Typer(help="YAML-driven LangGraph utilities.", name="lg")

    @app.command("validate")
    def validate_command(  # noqa: WPS430
        pkg: Path = typer.Option(Path.cwd(), "--pkg", "-p", help="Package root directory"),
    ) -> None:
        try:
            validate_package(pkg)
        except Exception as exc:  # pragma: no cover - CLI surface
            typer.secho(f"Validation failed: {exc}", fg=typer.colors.RED)
            raise typer.Exit(code=1) from exc
        typer.secho("Validation succeeded", fg=typer.colors.GREEN)

    @app.command("schema")
    def schema_command(  # noqa: WPS430
        output: Path = typer.Option(Path("schema.v1.json"), "--out", "-o", help="Output JSON Schema path"),
        kind: str | None = typer.Option(None, help="Optional document kind to export"),
    ) -> None:
        document_kind = None
        if kind:
            from ...yaml_runtime.schema import DocumentKind

            try:
                document_kind = DocumentKind(kind)
            except ValueError as exc:  # pragma: no cover - CLI surface
                typer.secho(f"Unknown document kind '{kind}'", fg=typer.colors.RED)
                raise typer.Exit(code=1) from exc
        export_json_schema(output, document_kind)
        typer.secho(f"Schema written to {output}", fg=typer.colors.GREEN)

    @app.command("run")
    def run_command(  # noqa: WPS430
        pkg: Path = typer.Option(Path.cwd(), "--pkg", "-p", help="Package root directory"),
        workflow: str = typer.Option(..., "--workflow", "-w", help="Workflow reference"),
        inputs_json: str = typer.Option("{}", "--input", "-i", help="JSON blob of workflow inputs"),
        artifacts_dir: Path = typer.Option(Path("artifacts"), "--out", help="Artifacts directory"),
        trace: bool = typer.Option(False, "--trace", help="Print execution trace"),
    ) -> None:
        try:
            inputs: Mapping[str, Any] = json.loads(inputs_json)
        except json.JSONDecodeError as exc:  # pragma: no cover - CLI surface
            typer.secho(f"Invalid JSON payload: {exc}", fg=typer.colors.RED)
            raise typer.Exit(code=1) from exc
        try:
            result = run_workflow(
                pkg,
                workflow,
                inputs,
                artifacts_dir=artifacts_dir,
                options=RunOptions(artifacts_dir=artifacts_dir),
            )
        except Exception as exc:  # pragma: no cover - CLI surface
            typer.secho(f"Workflow failed: {exc}", fg=typer.colors.RED)
            raise typer.Exit(code=1) from exc
        typer.echo(json.dumps(result.final_state, indent=2, ensure_ascii=False))
        typer.secho(f"Artifacts saved to {artifacts_dir.resolve()}", fg=typer.colors.GREEN)
        if trace:
            typer.echo(json.dumps([asdict(entry) for entry in result.trace], indent=2, ensure_ascii=False))

    @app.command("graphviz")
    def graphviz_command(  # noqa: WPS430
        pkg: Path = typer.Option(Path.cwd(), "--pkg", "-p", help="Package root directory"),
        workflow: str = typer.Option(..., "--workflow", "-w", help="Workflow reference"),
        output: Path | None = typer.Option(None, "--out", "-o", help="Optional file for DOT output"),
    ) -> None:
        dot = workflow_graphviz(pkg, workflow)
        if output:
            output.write_text(dot, encoding="utf-8")
            typer.secho(f"Graphviz DOT written to {output}", fg=typer.colors.GREEN)
        else:
            typer.echo(dot)

    cli.add_typer(app)


__all__ = ["register"]
