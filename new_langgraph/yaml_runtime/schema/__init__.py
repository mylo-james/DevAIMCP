"""Public interface for LangGraph YAML schema models."""
from __future__ import annotations

from json import dumps as json_dumps
from pathlib import Path
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Type

from pydantic import TypeAdapter

from .base import DocumentKind, SCHEMA_VERSION, YAMLDocument
from .documents import DOCUMENT_MODELS, DOCUMENT_MODEL_LIST
from .versioning import apply_migrations


DocumentModelType = Type[YAMLDocument]


def _document_union_type():
    union = DOCUMENT_MODEL_LIST[0]
    for model in DOCUMENT_MODEL_LIST[1:]:
        union = union | model  # type: ignore[operator]
    return union


_DOCUMENT_UNION = _document_union_type()
_DOCUMENT_TYPE_ADAPTER = TypeAdapter(_DOCUMENT_UNION)


def parse_document(payload: Mapping[str, Any]) -> YAMLDocument:
    """Parse a dict payload into the appropriate document model."""

    if "kind" not in payload:
        raise ValueError("document missing 'kind'")
    kind = DocumentKind(str(payload["kind"]))
    data: MutableMapping[str, Any] = dict(payload)
    if data.get("version") != SCHEMA_VERSION:
        data = apply_migrations(data, target=SCHEMA_VERSION)
    model = DOCUMENT_MODELS[kind]
    return model.model_validate(dict(data))


def parse_documents(payloads: Iterable[Mapping[str, Any]]) -> Dict[str, YAMLDocument]:
    """Parse a sequence of payloads returning a map keyed by `<namespace>:<kind>:<id>`."""

    documents: Dict[str, YAMLDocument] = {}
    for payload in payloads:
        document = parse_document(payload)
        key = make_document_key(document.namespace, document.kind, document.id)
        if key in documents:
            raise ValueError(f"duplicate document detected: {key}")
        documents[key] = document
    return documents


def make_document_key(namespace: str | None, kind: DocumentKind, identifier: str) -> str:
    prefix = f"{namespace}:" if namespace else ""
    return f"{prefix}{kind.value}:{identifier}"


def document_json_schema(kind: DocumentKind | None = None) -> Dict[str, Any]:
    """Return JSON schema for a specific kind or the full union."""

    if kind is not None:
        model = DOCUMENT_MODELS[kind]
        schema = model.model_json_schema(mode="validation")
    else:
        schema = _DOCUMENT_TYPE_ADAPTER.json_schema()
    schema.setdefault("$schema", "https://json-schema.org/draft/2020-12/schema")
    schema.setdefault("title", "LangGraph YAML Document")
    schema.setdefault("$id", "https://langgraph.dev/schema/v1")
    return schema


def write_json_schema(path: str | Path, kind: DocumentKind | None = None) -> Path:
    """Serialize the JSON schema to disk."""

    target = Path(path)
    target.write_text(
        json_dumps(document_json_schema(kind), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return target


__all__ = [
    "DocumentKind",
    "DocumentModelType",
    "SCHEMA_VERSION",
    "YAMLDocument",
    "document_json_schema",
    "write_json_schema",
    "make_document_key",
    "parse_document",
    "parse_documents",
]
