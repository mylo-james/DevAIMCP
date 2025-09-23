"""YAML discovery, parsing, and registry construction utilities."""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Mapping, MutableMapping

import yaml

from .errors import (
    DuplicateDocumentError,
    InvalidImportError,
    MissingReferenceError,
    Provenance,
    ReferenceCycleError,
    YAMLRuntimeError,
)
from .schema import DocumentKind, YAMLDocument, make_document_key, parse_document
from .schema.documents import PackageDocument


SUPPORTED_SUFFIXES = {".yaml", ".yml"}


class _LineLoader(yaml.SafeLoader):
    """PyYAML loader that records the start line for each document."""

    def compose_document(self):  # type: ignore[override]
        node = super().compose_document()
        self._last_start_line = node.start_mark.line + 1  # type: ignore[attr-defined]
        return node


@dataclass(frozen=True, slots=True)
class RawDocument:
    data: MutableMapping[str, Any]
    provenance: Provenance


@dataclass(frozen=True, slots=True)
class RegistryEntry:
    document: YAMLDocument
    provenance: Provenance

    @property
    def key(self) -> str:
        return make_document_key(self.document.namespace, self.document.kind, self.document.id)


@dataclass(frozen=True, slots=True)
class Dependency:
    key: str
    raw: str


def discover_yaml_files(root: Path, recursive: bool = True) -> List[Path]:
    """Return YAML files under ``root``.

    When ``recursive`` is ``True`` (default) the result includes all nested
    directories. Otherwise only files directly within ``root`` are returned.
    """

    iterator = root.rglob("*") if recursive else root.iterdir()
    files: List[Path] = []
    for path in sorted(iterator):
        if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES:
            files.append(path)
    return files


def _iter_raw_documents(path: Path) -> Iterator[RawDocument]:
    text = path.read_text(encoding="utf-8")
    loader = _LineLoader(text)
    try:
        while loader.check_data():
            payload = loader.get_data()
            if payload is None:
                continue
            if not isinstance(payload, Mapping):
                raise YAMLRuntimeError(
                    "YAML documents must be mappings at the top level",
                    Provenance(path, getattr(loader, "_last_start_line", 1)),
                )
            line = getattr(loader, "_last_start_line", 1)
            yield RawDocument(data=dict(payload), provenance=Provenance(path, line))
    finally:
        loader.dispose()


def _collect_references(data: Any, field: str | None = None, refs: set[str] | None = None) -> set[str]:
    if refs is None:
        refs = set()
    if isinstance(data, Mapping):
        for key, value in data.items():
            if key.endswith("_ref") and isinstance(value, str):
                refs.add(value)
            elif key.endswith("_refs") and isinstance(value, list):
                refs.update(str(item) for item in value if isinstance(item, str))
            else:
                _collect_references(value, key, refs)
    elif isinstance(data, list):
        for item in data:
            _collect_references(item, field, refs)
    return refs


def normalize_ref(raw_ref: str, namespace: str | None = None) -> str:
    parts = raw_ref.split(":")
    if len(parts) == 2:
        ns = namespace
        kind_str, identifier = parts
    elif len(parts) == 3:
        ns, kind_str, identifier = parts
    else:
        raise ValueError(f"invalid reference '{raw_ref}'")
    try:
        kind = DocumentKind(kind_str)
    except ValueError as exc:  # pragma: no cover - defensive
        raise ValueError(f"unknown document kind in reference '{raw_ref}'") from exc
    return make_document_key(ns, kind, identifier)


class YAMLRegistry:
    """In-memory registry keyed by `<namespace>:<kind>:<id>`."""

    def __init__(self) -> None:
        self._entries: Dict[str, RegistryEntry] = {}
        self._dependencies: Dict[str, List[Dependency]] = {}

    def add(self, entry: RegistryEntry) -> str:
        key = entry.key
        if key in self._entries:
            raise DuplicateDocumentError(f"duplicate document id '{key}'", entry.provenance)
        self._entries[key] = entry
        references = _collect_references(entry.document.model_dump(by_alias=True))
        deps: List[Dependency] = []
        for ref in references:
            try:
                dep_key = normalize_ref(ref, entry.document.namespace)
            except ValueError as exc:
                raise YAMLRuntimeError(str(exc), entry.provenance) from exc
            deps.append(Dependency(dep_key, ref))
        self._dependencies[key] = deps
        return key

    def add_dependency(self, source_key: str, ref: str, namespace: str | None) -> None:
        try:
            dep_key = normalize_ref(ref, namespace)
        except ValueError as exc:
            provenance = self._entries[source_key].provenance
            raise YAMLRuntimeError(str(exc), provenance) from exc
        self._dependencies.setdefault(source_key, []).append(Dependency(dep_key, ref))

    def get(self, key: str) -> YAMLDocument:
        return self._entries[key].document

    def entry(self, key: str) -> RegistryEntry:
        return self._entries[key]

    def items(self) -> Iterable[tuple[str, RegistryEntry]]:
        return self._entries.items()

    def validate(self) -> None:
        for source_key, deps in self._dependencies.items():
            for dep in deps:
                if dep.key not in self._entries:
                    provenance = self._entries[source_key].provenance
                    raise MissingReferenceError(
                        f"missing reference '{dep.raw}' from '{source_key}'",
                        provenance,
                    )
        self._detect_cycles()

    def _detect_cycles(self) -> None:
        visiting: set[str] = set()
        visited: set[str] = set()
        path: List[str] = []

        def visit(node: str) -> None:
            if node in visited:
                return
            if node in visiting:
                cycle = path[path.index(node) :] + [node]
                provenance = self._entries[node].provenance
                cycle_str = " -> ".join(cycle)
                raise ReferenceCycleError(f"reference cycle detected: {cycle_str}", provenance)
            visiting.add(node)
            path.append(node)
            for dep in self._dependencies.get(node, []):
                if dep.key in self._entries:
                    visit(dep.key)
            visiting.remove(node)
            path.pop()
            visited.add(node)

        for key in list(self._entries.keys()):
            visit(key)


class PackageLoader:
    """Loads YAML packages from a root directory including nested imports."""

    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.registry = YAMLRegistry()
        self._visited_dirs: set[Path] = set()

    def load(self) -> YAMLRegistry:
        queue: deque[Path] = deque([self.root])
        while queue:
            current = queue.popleft().resolve()
            if current in self._visited_dirs:
                continue
            if not current.exists():
                raise InvalidImportError(f"imported package path does not exist: {current}")
            self._visited_dirs.add(current)
            for subdir in sorted(p for p in current.iterdir() if p.is_dir()):
                if subdir not in self._visited_dirs:
                    queue.append(subdir)
            raw_docs = [
                doc
                for path in discover_yaml_files(current, recursive=False)
                for doc in _iter_raw_documents(path)
            ]
            if not raw_docs:
                continue
            package_docs = []
            default_namespace: str | None = None
            for raw in raw_docs:
                if str(raw.data.get("kind")) == DocumentKind.PACKAGE.value:
                    doc = parse_document(raw.data)
                    package_docs.append((doc, raw))
                    if doc.default_namespace:
                        if default_namespace and default_namespace != doc.default_namespace:
                            raise YAMLRuntimeError(
                                "conflicting default namespaces in package",
                                raw.provenance,
                            )
                        default_namespace = doc.default_namespace
            for package_doc, raw in package_docs:
                entry = RegistryEntry(document=package_doc, provenance=raw.provenance)
                package_key = self.registry.add(entry)
                for import_target in package_doc.imports:
                    queued = self._resolve_import(current, import_target, raw.provenance)
                    for path in queued:
                        if path not in self._visited_dirs:
                            queue.append(path)
                    if not queued:
                        # treat as reference to another package document
                        self.registry.add_dependency(package_key, import_target, package_doc.namespace)
            for raw in raw_docs:
                if str(raw.data.get("kind")) == DocumentKind.PACKAGE.value:
                    continue
                data = dict(raw.data)
                if default_namespace and not data.get("namespace"):
                    data["namespace"] = default_namespace
                document = parse_document(data)
                entry = RegistryEntry(document=document, provenance=raw.provenance)
                self.registry.add(entry)
        self.registry.validate()
        return self.registry

    def _resolve_import(self, base: Path, target: str, provenance: Provenance) -> List[Path]:
        candidate = (base / target).resolve()
        if candidate.exists():
            if candidate.is_dir():
                return [candidate]
            if candidate.is_file() and candidate.suffix.lower() in SUPPORTED_SUFFIXES:
                # Load a single file by treating its parent directory as a package boundary.
                return [candidate.parent]
            raise InvalidImportError(
                f"unsupported import target '{target}'", provenance
            )
        if ":" in target:
            return []
        raise InvalidImportError(f"import path not found: '{target}'", provenance)


def load_registry(root: Path) -> YAMLRegistry:
    """Convenience helper that loads the package rooted at ``root``."""

    loader = PackageLoader(root)
    return loader.load()


__all__ = [
    "PackageLoader",
    "RegistryEntry",
    "YAMLRegistry",
    "discover_yaml_files",
    "normalize_ref",
    "load_registry",
]
