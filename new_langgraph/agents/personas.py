"""Agent persona definitions sourced from the BMAD core library."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict

from ..assets import AssetMissingError, Document, load_agent_persona


@dataclass(slots=True)
class Persona:
    """Persona configuration backed by BMAD agent playbooks."""

    name: str
    tone: str
    expertise: str
    signature: str
    asset_name: str
    _document: Document | None = field(init=False, default=None, repr=False)

    @property
    def document(self) -> Document:
        """Return the structured persona document."""
        if self._document is None:
            try:
                self._document = load_agent_persona(self.asset_name)
            except AssetMissingError:
                self._document = Document(
                    type="agent",
                    id=self.asset_name.removesuffix(".yaml"),
                    title=self.name,
                    version=1,
                    source_path=self.asset_name,
                    summary="",
                    metadata={"missing": True},
                    sections=[],
                )
        return self._document

    @property
    def instructions(self) -> str:
        """Return a markdown rendering of the persona guidance."""
        return self.document.to_markdown()


_PERSONAS: Dict[str, Persona] = {
    "analyst": Persona(
        name="Analyst",
        tone="curious and thorough",
        expertise="business analysis and research",
        signature="-- Analyst Bot",
        asset_name="analyst.yaml",
    ),
    "pm": Persona(
        name="Product Manager",
        tone="goal-driven and collaborative",
        expertise="product discovery and prioritization",
        signature="-- Product Manager",
        asset_name="pm.yaml",
    ),
    "ux": Persona(
        name="UX Designer",
        tone="empathetic and narrative",
        expertise="user research and experience design",
        signature="-- UX Designer",
        asset_name="ux-expert.yaml",
    ),
    "architect": Persona(
        name="Software Architect",
        tone="systemic and pragmatic",
        expertise="software architecture and trade-offs",
        signature="-- Architect",
        asset_name="architect.yaml",
    ),
    "po": Persona(
        name="Product Owner",
        tone="backlog-focused and clarifying",
        expertise="story refinement and acceptance criteria",
        signature="-- Product Owner",
        asset_name="po.yaml",
    ),
    "qa": Persona(
        name="Quality Analyst",
        tone="critical and preventative",
        expertise="testing strategy and validation",
        signature="-- QA Analyst",
        asset_name="qa.yaml",
    ),
    "sm": Persona(
        name="Scrum Master",
        tone="facilitative and outcome-driven",
        expertise="iteration planning and facilitation",
        signature="-- Scrum Master",
        asset_name="sm.yaml",
    ),
    "dev": Persona(
        name="Developer",
        tone="technical and delivery-minded",
        expertise="implementation planning and risk assessment",
        signature="-- Developer",
        asset_name="dev.yaml",
    ),
}


def get_persona(name: str) -> Persona:
    """Return the named persona, defaulting to a neutral analyst."""
    key = name.lower()
    return _PERSONAS.get(key, _PERSONAS["analyst"])


def persona_instructions(name: str) -> str:
    """Convenience helper to fetch persona instructions by name."""
    return get_persona(name).instructions


def persona_document(name: str) -> Document:
    """Return the structured persona document."""
    return get_persona(name).document


__all__ = ["Persona", "get_persona", "persona_document", "persona_instructions"]
