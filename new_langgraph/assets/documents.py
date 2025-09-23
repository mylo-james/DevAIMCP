"""Typed representations for BMAD YAML documents."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

import yaml

from .errors import AssetMissingError
from ._context import read_text


@dataclass(slots=True)
class Section:
    """Hierarchical section within a BMAD document."""

    id: str
    title: str
    level: int
    content: str | None = None
    sections: list["Section"] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Section":
        """Create a Section from a raw dictionary structure."""
        raw_children = data.get("sections", []) or []
        children = [cls.from_dict(child) for child in raw_children]
        return cls(
            id=str(data.get("id", "section")),
            title=str(data.get("title", "")),
            level=int(data.get("level", 0)),
            content=data.get("content"),
            sections=children,
        )

    def iter_markdown_blocks(self) -> Iterable[str]:
        """Yield markdown blocks representing this section in order."""
        heading = ""
        if self.level > 0 and self.title:
            heading = "#" * self.level + f" {self.title}"
        elif self.level == 0 and self.title and self.sections:
            heading = self.title

        if heading:
            yield heading

        if self.content:
            yield self.content.strip()

        for child in self.sections:
            yield from child.iter_markdown_blocks()


@dataclass(slots=True)
class Document:
    """Structured representation of a BMAD YAML document."""

    type: str
    id: str
    title: str
    version: int
    source_path: str
    summary: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    config: dict[str, Any] | None = None
    sections: list[Section] = field(default_factory=list)

    @classmethod
    def from_yaml(cls, content: str) -> "Document":
        """Parse a YAML document string into a Document model."""
        data = yaml.safe_load(content) or {}
        raw_sections = data.get("sections", []) or []
        sections = [Section.from_dict(section) for section in raw_sections]
        return cls(
            type=str(data.get("type", "doc")),
            id=str(data.get("id", "")),
            title=str(data.get("title", "")),
            version=int(data.get("version", 1)),
            source_path=str(data.get("source_path", "")),
            summary=data.get("summary"),
            metadata=dict(data.get("metadata", {}) or {}),
            config=dict(data.get("config", {}) or {}) if data.get("config") else None,
            sections=sections,
        )

    def to_markdown(self) -> str:
        """Render the document back to markdown for legacy consumers."""
        blocks: list[str] = []
        for section in self.sections:
            blocks.extend(section.iter_markdown_blocks())
        markdown = "\n\n".join(block for block in blocks if block).strip()
        return markdown


def ensure_yaml_suffix(name: str) -> str:
    """Normalize asset names to use the .yaml suffix."""
    if name.endswith(".yaml"):
        return name
    if name.endswith(".md"):
        return name[:-3] + ".yaml"
    return f"{name}.yaml"


def load_document(name: str, directory: Path) -> Document:
    """Load a document by relative name from the given BMAD directory."""
    filename = ensure_yaml_suffix(name)
    path = directory / filename
    if not path.exists():
        raise AssetMissingError(f"Missing BMAD document: {path}")
    return Document.from_yaml(read_text(path))


def load_document_from_path(path: Path) -> Document:
    """Load a document from an explicit filesystem path."""
    if not path.exists():
        raise AssetMissingError(f"Missing BMAD document: {path}")
    return Document.from_yaml(read_text(path))


__all__ = [
    "Document",
    "Section",
    "ensure_yaml_suffix",
    "load_document",
    "load_document_from_path",
]
