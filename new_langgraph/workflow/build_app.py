"""Assembly of the LangGraph application graph (simplified)."""
from __future__ import annotations

from dataclasses import dataclass
from functools import partial
from typing import Any, Callable, Dict, Iterable, Mapping

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
from ..state import BmadState
from ..storage import get_knowledge_store

NodeFn = Callable[[BmadState], Dict[str, Any]]


@dataclass(slots=True)
class StateSnapshot:
    """Container mirroring the LangGraph snapshot API."""

    values: Dict[str, Any]


class SimpleWorkflowApp:
    """Minimal workflow runner that executes planning and story pipelines."""

    _DEFAULT_THREAD_KEY = "__default__"

    def __init__(self, planning_nodes: Iterable[NodeFn], story_nodes: Iterable[NodeFn]) -> None:
        self._planning_nodes = list(planning_nodes)
        self._story_nodes = list(story_nodes)
        self._states: Dict[str, Dict[str, Any]] = {}

    def invoke(self, payload: Any, *, config: Dict[str, Any] | None = None) -> Dict[str, Any]:
        thread_key = self._thread_key(config)

        if isinstance(payload, dict) and payload.get("goal"):
            # Fresh plan run.
            state = dict(payload)
            self._states[thread_key] = state
            self._run_nodes(thread_key, self._planning_nodes)
            return state

        state = self._ensure_state(thread_key)

        if isinstance(payload, dict) and not payload:
            # next_story command
            self._run_nodes(thread_key, self._story_nodes)
            return state

        resume_payload = self._extract_resume_payload(payload)
        if resume_payload is not None:
            state.setdefault("resume_payloads", []).append(resume_payload)
            self._run_nodes(thread_key, self._story_nodes)
            return state

        return state

    def load_thread_state(self, thread_id: str | None, values: Mapping[str, Any]) -> None:
        """Hydrate workflow state for an existing thread from persisted values."""
        thread_key = str(thread_id) if thread_id else self._DEFAULT_THREAD_KEY
        self._states[thread_key] = dict(values)

    def get_state(self, *, config: Dict[str, Any] | None = None) -> StateSnapshot | None:
        thread_key = self._thread_key(config)
        state = self._states.get(thread_key)
        if state is None:
            return None
        return StateSnapshot(values=state)

    def _run_nodes(self, thread_key: str, nodes: Iterable[NodeFn]) -> None:
        state = self._states[thread_key]
        for node in nodes:
            updates = node(state)  # type: ignore[arg-type]
            if updates:
                state.update(updates)

    def _ensure_state(self, thread_key: str) -> Dict[str, Any]:
        return self._states.setdefault(thread_key, {})

    def _thread_key(self, config: Dict[str, Any] | None) -> str:
        if isinstance(config, dict):
            configurable = config.get("configurable")
            if isinstance(configurable, dict):
                thread_id = configurable.get("thread_id")
                if thread_id:
                    return str(thread_id)
        return self._DEFAULT_THREAD_KEY

    @staticmethod
    def _extract_resume_payload(payload: Any) -> Dict[str, Any] | None:
        resume_payload: Dict[str, Any] | None = None
        if hasattr(payload, "resume"):
            candidate = getattr(payload, "resume")
            if isinstance(candidate, dict):
                resume_payload = candidate
        elif hasattr(payload, "kwargs"):
            candidate = getattr(payload, "kwargs")
            if isinstance(candidate, dict):
                resume_payload = candidate
        if resume_payload is None and hasattr(payload, "__dict__"):
            candidate_dict = getattr(payload, "__dict__", {})
            if isinstance(candidate_dict, dict):
                potential = candidate_dict.get("resume")
                if isinstance(potential, dict):
                    resume_payload = potential
        return resume_payload


def build_app(
    *,
    paths: PathConfig | None = None,
    db_path: str | None = "bmad.db",
):
    """Compile the workflow application with optional overrides."""
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

    knowledge_store = get_knowledge_store()

    planning_nodes: list[NodeFn] = [
        partial(analyst_brief, paths=path_config, knowledge_store=knowledge_store),
        partial(pm_create_prd, paths=path_config, knowledge_store=knowledge_store),
        approve_prd,
        partial(ux_spec_optional, paths=path_config, knowledge_store=knowledge_store),
        partial(architect_design, paths=path_config, knowledge_store=knowledge_store),
        approve_architecture,
        partial(po_validate_artifacts, knowledge_store=knowledge_store),
        partial(po_shard_documents, paths=path_config, knowledge_store=knowledge_store),
    ]

    story_nodes: list[NodeFn] = [
        partial(sm_create_story, paths=path_config, knowledge_store=knowledge_store),
        partial(po_story_review, paths=path_config, knowledge_store=knowledge_store),
        partial(dev_plan_story, paths=path_config, knowledge_store=knowledge_store),
        partial(qa_review_story, paths=path_config, knowledge_store=knowledge_store),
        partial(qa_gate_update, paths=path_config, knowledge_store=knowledge_store),
        partial(story_done, paths=path_config, knowledge_store=knowledge_store),
    ]

    return SimpleWorkflowApp(planning_nodes, story_nodes)


__all__ = ["build_app", "SimpleWorkflowApp", "StateSnapshot"]
