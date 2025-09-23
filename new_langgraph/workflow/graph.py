"""LangGraph graph definition mirroring the SimpleWorkflowApp pipeline."""
from __future__ import annotations

from functools import partial
from typing import Any, Dict

from langgraph.graph import END, START, StateGraph

from ..config import PathConfig, default_paths, ensure_dirs
from ..nodes.planning.analyst_brief import analyst_brief
from ..nodes.planning.approve_architecture import approve_architecture
from ..nodes.planning.approve_prd import approve_prd
from ..nodes.planning.architect_design import architect_design
from ..nodes.planning.pm_create_prd import pm_create_prd
from ..nodes.planning.po_shard_documents import po_shard_documents
from ..nodes.planning.po_validate_artifacts import po_validate_artifacts
from ..nodes.planning.ux_spec_optional import ux_spec_optional
from ..nodes.stories.dev_plan_story import dev_plan_story
from ..nodes.stories.po_story_review import po_story_review
from ..nodes.stories.qa_gate_update import qa_gate_update
from ..nodes.stories.qa_review_story import qa_review_story
from ..nodes.stories.sm_create_story import sm_create_story
from ..nodes.stories.story_done import story_done
from .sm_router import scrum_master_router
from ..storage import get_knowledge_store


def _configure_paths(paths: PathConfig | None) -> PathConfig:
    path_config = paths or default_paths()
    ensure_dirs(
        path_config["docs_root"],
        path_config["stories_root"],
        path_config["epics_root"],
        path_config["qa_root"],
        path_config["qa_assessments"],
        path_config["qa_gates"],
        path_config["logs_root"],
    )
    return path_config


def build_state_graph(paths: PathConfig | None = None) -> StateGraph[Dict[str, Any]]:
    """Construct the LangGraph StateGraph equivalent of SimpleWorkflowApp."""
    path_config = _configure_paths(paths)
    knowledge_store = get_knowledge_store()

    graph = StateGraph(dict)

    graph.add_node(
        "analyst_brief",
        partial(analyst_brief, paths=path_config, knowledge_store=knowledge_store),
    )
    graph.add_node(
        "pm_create_prd",
        partial(pm_create_prd, paths=path_config, knowledge_store=knowledge_store),
    )
    graph.add_node("approve_prd", approve_prd)
    graph.add_node(
        "ux_spec_optional",
        partial(ux_spec_optional, paths=path_config, knowledge_store=knowledge_store),
    )
    graph.add_node(
        "architect_design",
        partial(architect_design, paths=path_config, knowledge_store=knowledge_store),
    )
    graph.add_node("approve_architecture", approve_architecture)
    graph.add_node(
        "po_validate_artifacts",
        partial(po_validate_artifacts, knowledge_store=knowledge_store),
    )
    graph.add_node(
        "po_shard_documents",
        partial(po_shard_documents, paths=path_config, knowledge_store=knowledge_store),
    )

    graph.add_node(
        "sm_create_story",
        partial(sm_create_story, paths=path_config, knowledge_store=knowledge_store),
    )
    graph.add_node(
        "po_story_review",
        partial(po_story_review, paths=path_config, knowledge_store=knowledge_store),
    )
    graph.add_node(
        "dev_plan_story",
        partial(dev_plan_story, paths=path_config, knowledge_store=knowledge_store),
    )
    graph.add_node(
        "qa_review_story",
        partial(qa_review_story, paths=path_config, knowledge_store=knowledge_store),
    )
    graph.add_node(
        "qa_gate_update",
        partial(qa_gate_update, paths=path_config, knowledge_store=knowledge_store),
    )
    graph.add_node(
        "story_done",
        partial(story_done, paths=path_config, knowledge_store=knowledge_store),
    )

    # Planning edges
    graph.add_edge(START, "analyst_brief")
    graph.add_edge("analyst_brief", "pm_create_prd")
    graph.add_edge("pm_create_prd", "approve_prd")
    graph.add_edge("approve_prd", "ux_spec_optional")
    graph.add_edge("ux_spec_optional", "architect_design")
    graph.add_edge("architect_design", "approve_architecture")
    graph.add_edge("approve_architecture", "po_validate_artifacts")
    graph.add_edge("po_validate_artifacts", "po_shard_documents")
    graph.add_edge("po_shard_documents", "sm_create_story")

    # Story loop edges
    graph.add_conditional_edges(
        "sm_create_story",
        lambda state: scrum_master_router(state),
        {
            "complete": END,
            "has_story": "po_story_review",
            "noop": END,
        },
    )
    graph.add_edge("po_story_review", "dev_plan_story")
    graph.add_edge("dev_plan_story", "qa_review_story")
    graph.add_edge("qa_review_story", "qa_gate_update")
    graph.add_edge("qa_gate_update", "story_done")
    graph.add_edge("story_done", "sm_create_story")

    return graph


def build_compiled_graph(paths: PathConfig | None = None):
    """Compile the state graph for execution and dev-server usage."""
    return build_state_graph(paths=paths).compile()


# Pre-compiled graph for langgraph dev tooling.
graph = build_compiled_graph()


__all__ = ["build_state_graph", "build_compiled_graph", "graph"]
