"""Architect design node implementation."""
from __future__ import annotations

from typing import Any, Dict

from ... import assets
from ...agents.registry import generate_response
from ...config import PathConfig
from ...nodes.stories.shared import store_document
from ...retrieval import retrieve_snippets
from ...state import BmadState
from ...storage import HybridKnowledgeStore
from .shared import doc_id_from_state, load_task, project_type_flags


def architect_design(
    state: BmadState,
    *,
    paths: PathConfig,
    knowledge_store: HybridKnowledgeStore | None = None,
) -> Dict[str, Any]:
    """Produce an architecture summary that informs downstream roles."""
    if state.get("architecture"):
        return {}

    goal = state.get("goal", "")
    project_type = state.get("project_type", "")
    context = retrieve_snippets(goal, knowledge_store, role="architect", collection="planning")
    flags = project_type_flags(project_type)
    architecture_doc = load_task("architect-solution-blueprint.yaml")

    emphasis = "backend" if flags.emphasizes_backend else "frontend" if flags.emphasizes_frontend else "full-stack"

    prompt = (
        "You are the Software Architect. Draft a system design summary focusing on decisions and trade-offs.\n"
        f"Goal: {goal}\n"
        f"Project type: {project_type} ({emphasis})\n\n"
        f"Reference context:\n{context}\n\n"
        f"Guidance:\n{architecture_doc.to_markdown()}\n\n"
        "Return markdown with sections: Overview, Components, Data, Risks, Follow-up Questions."
    )
    content = generate_response(
        "architect",
        prompt,
        workflow="architect_design",
        knowledge_store=knowledge_store,
    )

    arch_path = paths["architecture"]
    assets.write_doc(arch_path, content)

    doc_id = doc_id_from_state(state, "architecture")
    store_document(
        knowledge_store,
        content,
        collection="planning",
        metadata={"artifact": "architecture", "goal": goal, "path": str(arch_path)},
        doc_id=doc_id,
    )

    return {"architecture": content}


__all__ = ["architect_design"]
