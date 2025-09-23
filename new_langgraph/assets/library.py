"""Helpers for indexing BMAD library assets."""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator

from typing import TYPE_CHECKING

from ..config import BMAD_CORE_DIR

if TYPE_CHECKING:
    from ..storage import HybridKnowledgeStore

_CHUNK_PATTERN = re.compile(r"\n\s*\n", re.MULTILINE)
_MAX_CHARS = 1200
_MIN_CHARS = 400
_SUPPORTED_SUFFIXES = {".md", ".yaml", ".yml"}


@dataclass(frozen=True, slots=True)
class LibraryChunk:
    """Represents a chunked piece of a BMAD library asset."""

    doc_id: str
    content: str
    path: Path
    index: int
    total: int

    @property
    def metadata(self) -> dict[str, object]:
        relative = self.path.relative_to(BMAD_CORE_DIR)
        parts = relative.parts
        category = parts[0] if parts else "root"
        title = relative.stem.replace("-", " ")
        summary = _summarize(self.content)
        return {
            "id": self.doc_id,
            "path": str(relative),
            "asset_category": category,
            "chunk": self.index,
            "chunks": self.total,
            "summary": summary,
            "title": title,
        }


def seed_library(store: "HybridKnowledgeStore", *, collection: str = "bmad_documents") -> int:
    """Populate the provided store with chunked BMAD library assets."""
    count = 0
    for chunk in iter_library_chunks():
        store.add_document(
            chunk.content,
            metadata=chunk.metadata,
            collection=collection,
        )
        count += 1
    return count


def iter_library_chunks() -> Iterator[LibraryChunk]:
    """Yield chunked documents for every supported asset in the BMAD library."""
    files = sorted(_iter_asset_files())
    for path in files:
        text = path.read_text(encoding="utf-8")
        pieces = list(_chunk_text(text))
        total = len(pieces)
        for idx, content in enumerate(pieces):
            doc_id = _chunk_id(path, idx)
            yield LibraryChunk(doc_id=doc_id, content=content, path=path, index=idx, total=total)


def _iter_asset_files() -> Iterable[Path]:
    for candidate in BMAD_CORE_DIR.rglob("*"):
        if not candidate.is_file():
            continue
        if candidate.suffix.lower() not in _SUPPORTED_SUFFIXES:
            continue
        yield candidate


def _chunk_text(text: str) -> Iterator[str]:
    paragraphs = [para.strip() for para in _CHUNK_PATTERN.split(text) if para.strip()]
    if not paragraphs:
        yield text.strip()
        return
    buffer: list[str] = []
    length = 0
    chunks: list[str] = []
    for para in paragraphs:
        para_len = len(para)
        if buffer and length + para_len + 2 > _MAX_CHARS:
            chunks.append("\n\n".join(buffer))
            buffer = [para]
            length = para_len
            continue
        buffer.append(para)
        length += para_len + 2
    if buffer:
        chunks.append("\n\n".join(buffer))
    if len(chunks) > 1 and len(chunks[-1]) < _MIN_CHARS:
        chunks[-2] = chunks[-2] + "\n\n" + chunks[-1]
        chunks.pop()
    for chunk in chunks:
        yield chunk


def _chunk_id(path: Path, index: int) -> str:
    relative = path.relative_to(BMAD_CORE_DIR)
    return f"{relative.as_posix()}#{index}"


def _summarize(content: str) -> str:
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("<!--"):
            continue
        return stripped[:160]
    return content[:160]


__all__ = ["seed_library", "iter_library_chunks", "LibraryChunk"]
