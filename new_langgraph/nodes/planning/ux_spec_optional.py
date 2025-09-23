"""UX optional spec node implementation."""
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


def ux_spec_optional(
    state: BmadState,
    *,
    paths: PathConfig,
    knowledge_store: HybridKnowledgeStore | None = None,
) -> Dict[str, Any]:
    """Create a UX specification if the project benefits from one."""
    if state.get("ux_spec") is not None:
        return {}

    goal = state.get("goal", "")
    context = retrieve_snippets(goal, knowledge_store, role="ux", collection="planning")
    research_doc = load_task("plan-ux-research.yaml")

    prompt = (
        "You are the UX Designer. Produce a succinct UX spec with user journeys, research prompts, and experience risks.\n"
        f"Goal: {goal}\n\n"
        f"Context:\n{context}\n\n"
        f"Research helper:\n{research_doc.to_markdown()}\n\n"
        "Return markdown with sections: Users, Journeys, Research Plan, Risks."
    )
    content = generate_response(
        "ux",
        prompt,
        workflow="ux_spec_optional",
        knowledge_store=knowledge_store,
    )

    spec_path = paths["docs_root"] / "ux-spec.md"
    assets.write_doc(spec_path, content)

    doc_id = doc_id_from_state(state, "ux_spec")
    store_document(
        knowledge_store,
        content,
        collection="planning",
        metadata={"artifact": "ux_spec", "goal": goal, "path": str(spec_path)},
        doc_id=doc_id,
    )

    return {"ux_spec": content}


__all__ = ["ux_spec_optional"]
