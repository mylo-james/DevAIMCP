"""Analyst brief node implementation."""
from __future__ import annotations

import json
from typing import Any, Dict

from ... import assets
from ...agents.registry import generate_response
from ...config import PathConfig
from ...nodes.stories.shared import store_document
from ...retrieval import retrieve_snippets
from ...state import BmadState
from ...storage import HybridKnowledgeStore
from .shared import doc_id_from_state, load_reference_doc, load_task, project_type_flags


def analyst_brief(
    state: BmadState,
    *,
    paths: PathConfig,
    knowledge_store: HybridKnowledgeStore | None = None,
) -> Dict[str, Any]:
    """Generate a project brief when one is not already stored in state."""
    if state.get("brief"):
        return {}

    thread_id = state.get("thread_id")
    project_slug = state.get("project_slug")
    template_yaml = assets.load_yaml("project-brief-tmpl.yaml")
    instructions = json.dumps(template_yaml.get("sections", {}), indent=2)
    brainstorming_doc = load_task("facilitate-brainstorming-session.yaml")
    elicitation_doc = load_task("advanced-elicitation.yaml")
    research_doc = load_task("create-deep-research-prompt.yaml")
    flags = project_type_flags(state.get("project_type", ""))
    brownfield_doc = load_reference_doc("working-in-the-brownfield.yaml") if flags.is_brownfield else None
    context = retrieve_snippets(
        state.get("goal", ""), knowledge_store, role="analyst", collection="planning"
    )

    brownfield_markdown = brownfield_doc.to_markdown() if brownfield_doc else ""
    brownfield_section = (
        "Brownfield guidance:\n"
        f"{brownfield_markdown}\n\n"
        if brownfield_markdown
        else ""
    )

    prompt = (
        "You are the Analyst. Produce a markdown project brief using the template sections.\n\n"
        f"Project goal: {state.get('goal', 'Unknown goal')}\n"
        f"Project type: {state.get('project_type', 'unspecified')}\n\n"
        f"Relevant knowledge snippets (optional):\n{context}\n\n"
        "Relevant BMAD tasks to consult:\n"
        f"- facilitate-brainstorming-session.yaml\n{brainstorming_doc.to_markdown()}\n\n"
        f"- advanced-elicitation.yaml\n{elicitation_doc.to_markdown()}\n\n"
        f"- create-deep-research-prompt.yaml\n{research_doc.to_markdown()}\n\n"
        f"{brownfield_section}"
        "Sections definition (JSON):\n"
        f"{instructions}\n\n"
        "Return markdown with clear headings matching the template."
    )
    content = generate_response(
        "analyst",
        prompt,
        workflow="analyst_brief",
        knowledge_store=knowledge_store,
        thread_id=thread_id,
        project_slug=project_slug,
    )

    brief_path = paths["docs_root"] / "brief.md"
    assets.write_doc(brief_path, content)

    doc_id = doc_id_from_state(state, "brief")
    store_document(
        knowledge_store,
        content,
        collection="planning",
        metadata={
            "artifact": "project_brief",
            "goal": state.get("goal"),
            "project_type": state.get("project_type"),
            "path": str(brief_path),
        },
        doc_id=doc_id,
    )

    return {"brief": content}


__all__ = ["analyst_brief"]
