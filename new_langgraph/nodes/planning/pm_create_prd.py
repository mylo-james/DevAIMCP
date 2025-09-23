"""PM create PRD node implementation."""
from __future__ import annotations

from typing import Any, Dict

from ... import assets
from ...agents.registry import generate_response
from ...config import PathConfig
from ...nodes.stories.shared import store_document
from ...retrieval import retrieve_snippets
from ...state import BmadState
from ...storage import HybridKnowledgeStore
from .shared import doc_id_from_state, load_task


def pm_create_prd(
    state: BmadState,
    *,
    paths: PathConfig,
    knowledge_store: HybridKnowledgeStore | None = None,
) -> Dict[str, Any]:
    """Create a lightweight PRD artifact summarizing goals and scope."""
    if state.get("prd"):
        return {}

    goal = state.get("goal", "")
    project_type = state.get("project_type", "")
    state.setdefault("story_queue", [])

    context = retrieve_snippets(goal, knowledge_store, role="pm", collection="planning")
    backlog_doc = load_task("build-product-backlog.yaml")

    prompt = (
        "You are the Product Manager. Write a concise PRD covering problem, outcome, scope, and success metrics.\n"
        f"Goal: {goal}\n"
        f"Project type: {project_type}\n\n"
        f"Reference notes:\n{context}\n\n"
        f"Backlog helper:\n{backlog_doc.to_markdown()}\n\n"
        "Return markdown with sections: Overview, Users, Scope, Success Metrics, Risks."
    )
    content = generate_response(
        "pm",
        prompt,
        workflow="pm_create_prd",
        knowledge_store=knowledge_store,
        goal=goal,
    )

    prd_path = paths["prd"]
    assets.write_doc(prd_path, content)

    doc_id = doc_id_from_state(state, "prd")
    store_document(
        knowledge_store,
        content,
        collection="planning",
        metadata={"artifact": "prd", "goal": goal, "project_type": project_type, "path": str(prd_path)},
        doc_id=doc_id,
    )

    return {"prd": content}


__all__ = ["pm_create_prd"]
