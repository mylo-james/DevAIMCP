"""Developer plan story node."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from ... import assets
from ...agents.registry import generate_response
from ...config import PathConfig
from ...retrieval import retrieve_snippets
from ...state import BmadState
from ...storage import HybridKnowledgeStore
from .shared import store_document, story_metadata_snapshot, update_story_outputs


def dev_plan_story(
    state: BmadState,
    *,
    paths: PathConfig,
    knowledge_store: HybridKnowledgeStore | None = None,
) -> Dict[str, Any]:
    """Produce a development plan for the current story."""
    current = state.get("current_story")
    if not isinstance(current, dict):
        return {}
    if current.get("status") not in {"draft", "approved", "in_progress"}:
        return {}

    thread_id = state.get("thread_id")
    project_slug = state.get("project_slug")
    story_id = str(current.get("id", current.get("title", "story")))

    story_path_value = current.get("filepath")
    story_path: Path | None = None
    story_text = current.get("title", "")
    if isinstance(story_path_value, str) and story_path_value.strip():
        candidate = Path(story_path_value)
        if candidate.is_file():
            story_path = candidate
            story_text = candidate.read_text(encoding="utf-8")

    context = retrieve_snippets(
        current.get("title", ""), knowledge_store, role="dev", collection="stories"
    )

    prompt = (
        "You are the Developer. Produce a development plan with tasks, testing strategy, and risks.\n"
        f"Story:\n{story_text}\n"
        f"Relevant knowledge:\n{context}\n"
    )
    plan = generate_response(
        "dev",
        prompt,
        workflow="dev_plan_story",
        knowledge_store=knowledge_store,
        thread_id=thread_id,
        project_slug=project_slug,
    )

    if story_path is not None:
        base_dir = story_path.parent
        base_name = story_path.stem or story_id
    else:
        base_dir = paths["stories_root"]
        base_name = story_id

    if base_name.endswith("-dev-plan"):
        dev_plan_filename = f"{base_name}.md"
    else:
        dev_plan_filename = f"{base_name}-dev-plan.md"

    dev_plan_path = base_dir / dev_plan_filename
    assets.write_doc(dev_plan_path, plan)

    store_document(
        knowledge_store,
        plan,
        collection="dev_plans",
        metadata={"artifact": "dev_plan", "story_id": story_id},
    )

    dev_plan_path_str = str(dev_plan_path)
    metadata = story_metadata_snapshot(state, story_id)
    metadata["dev_plan_path"] = dev_plan_path_str
    metadata["status"] = "review"

    story_outputs = update_story_outputs(state, story_id, metadata)

    current_story = dict(current)
    current_story["status"] = "review"
    current_story["dev_plan_path"] = dev_plan_path_str
    if story_path is None:
        current_story["filepath"] = str(paths["stories_root"] / f"{story_id}.md")

    return {
        "current_story": current_story,
        "story_outputs": story_outputs,
    }


__all__ = ["dev_plan_story"]
