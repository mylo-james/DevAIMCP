"""High-level runtime API for YAML-defined LangGraph workflows."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Mapping, Optional

from .builder import RunOptions, WorkflowBuilder, WorkflowResult
from .loader import load_registry, normalize_ref
from .schema import DocumentKind, write_json_schema
from .schema.documents import WorkflowDocument


def validate_package(package_path: Path) -> None:
    """Load and validate a package directory."""

    load_registry(package_path)


def run_workflow(
    package_path: Path,
    workflow_ref: str,
    inputs: Mapping[str, object],
    *,
    artifacts_dir: Optional[Path] = None,
    options: Optional[RunOptions] = None,
) -> WorkflowResult:
    registry = load_registry(package_path)
    builder = WorkflowBuilder(registry)
    runner = builder.build(workflow_ref, artifacts_dir=artifacts_dir)
    run_options = options or RunOptions(artifacts_dir=artifacts_dir)
    return runner.run(inputs, run_options)


def export_json_schema(target: Path, kind: Optional[DocumentKind] = None) -> Path:
    return write_json_schema(target, kind)


def workflow_graphviz(package_path: Path, workflow_ref: str) -> str:
    registry = load_registry(package_path)
    builder = WorkflowBuilder(registry)
    if ":" not in workflow_ref:
        workflow_ref = f"workflow:{workflow_ref}"
    workflow_key = normalize_ref(workflow_ref, None)
    workflow_doc = registry.entry(workflow_key).document
    if not isinstance(workflow_doc, WorkflowDocument):
        raise ValueError(f"reference '{workflow_ref}' is not a workflow")
    return _render_workflow_graph(workflow_doc)


def _render_workflow_graph(workflow: WorkflowDocument) -> str:
    lines = ["digraph workflow {"]
    lines.append("  rankdir=LR;")
    for node_id, node in workflow.nodes.items():
        if node.task_ref:
            label = node.task_ref
            shape = "box"
        elif node.router_ref:
            label = node.router_ref
            shape = "diamond"
        else:
            label = node_id
            shape = "ellipse"
        lines.append(f'  "{node_id}" [label="{label}", shape={shape}];')
    for edge in workflow.edges:
        label = ""
        if edge.when:
            label = json.dumps(edge.when, ensure_ascii=False)
            lines.append(f'  "{edge.source}" -> "{edge.to}" [label="{label}"];')
        else:
            lines.append(f'  "{edge.source}" -> "{edge.to}";')
    lines.append("}")
    return "\n".join(lines)


__all__ = [
    "RunOptions",
    "export_json_schema",
    "run_workflow",
    "validate_package",
    "workflow_graphviz",
]
