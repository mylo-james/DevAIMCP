"""Load task helper used by planning nodes."""
from __future__ import annotations

from hashlib import blake2s

from ....assets import AssetMissingError, load_markdown, load_reference_markdown
from ....assets.documents import Document, Section, ensure_yaml_suffix
from ....assets._context import UTILS_DIR


def _missing_document(name: str, doc_type: str) -> Document:
    """Return a placeholder document indicating the asset was missing."""
    section = Section(
        id="missing",
        title="Missing Asset",
        level=1,
        content=f"(The {doc_type} guidance '{name}' could not be found.)",
    )
    return Document(
        type=doc_type,
        id=name.removesuffix(".yaml"),
        title=f"Missing {doc_type}",
        version=1,
        source_path=name,
        summary=None,
        metadata={"missing": True},
        sections=[section],
    )


def load_task(name: str) -> Document:
    """Return task guidance as a structured document."""
    normalized = ensure_yaml_suffix(name)
    try:
        return load_markdown(normalized)
    except AssetMissingError:
        return _missing_document(normalized, "task")


def load_reference_doc(name: str) -> Document:
    """Load a reference document located under the utils directory."""
    normalized = ensure_yaml_suffix(name)
    path = UTILS_DIR / normalized
    try:
        return load_reference_markdown(path)
    except AssetMissingError:
        return _missing_document(normalized, "reference")


def _goal_fingerprint(goal: str, project_slug: str, slug: str) -> str:
    """Return a stable digest for goal-derived identifiers."""
    hasher = blake2s(digest_size=8)
    for value in (project_slug, goal, slug):
        hasher.update(value.encode("utf-8"))
        hasher.update(b"\0")
    return hasher.hexdigest()


def doc_id_from_state(state: dict[str, object], slug: str) -> str:
    """Derive a deterministic document identifier from the workflow state."""
    goal = str(state.get("goal") or "project")
    project_slug = str(state.get("project_slug") or "project")
    digest = _goal_fingerprint(goal, project_slug, slug)
    return f"{project_slug}:{slug}:{digest}"


__all__ = ["load_task", "load_reference_doc", "doc_id_from_state"]
