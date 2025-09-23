"""Typed state container derived from YAML `state` documents."""
from __future__ import annotations

from dataclasses import dataclass, field
import copy
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional

from .schema.documents import StateDocument, StateField


@dataclass(slots=True)
class StateFieldDefinition:
    name: str
    type: str
    default: Any | None
    required: bool


@dataclass(slots=True)
class StateDefinition:
    fields: Dict[str, StateFieldDefinition]
    persist: List[str]
    artifacts: List[str]

    @classmethod
    def from_document(cls, document: StateDocument) -> "StateDefinition":
        fields = {
            field.name: StateFieldDefinition(
                name=field.name,
                type=field.type,
                default=field.default,
                required=field.required,
            )
            for field in document.fields
        }
        for name in document.persist:
            if name not in fields:
                raise ValueError(f"persist references unknown field '{name}'")
        return cls(fields=fields, persist=list(document.persist), artifacts=list(document.artifacts))


@dataclass(slots=True)
class EventLogEntry:
    key: str
    value: Any


class StateStore:
    """Mutable workflow state with persistence helpers."""

    def __init__(
        self,
        definition: StateDefinition,
        initial: Optional[Mapping[str, Any]] = None,
        artifact_root: Optional[Path] = None,
    ) -> None:
        self.definition = definition
        self._values: Dict[str, Any] = {}
        self.artifact_root = artifact_root
        self.events: List[EventLogEntry] = []
        self.reset(initial)

    def reset(self, initial: Optional[Mapping[str, Any]] = None) -> None:
        self._values.clear()
        initial = initial or {}
        for name, definition in self.definition.fields.items():
            if name in initial:
                self._values[name] = initial[name]
            elif definition.default is not None:
                self._values[name] = copy.deepcopy(definition.default)
            else:
                self._values[name] = None

    def to_dict(self) -> Dict[str, Any]:
        return dict(self._values)

    def get(self, key: str, default: Any = None) -> Any:
        return self._values.get(key, default)

    def set(self, key: str, value: Any) -> None:
        if key not in self.definition.fields:
            raise KeyError(f"unknown state field '{key}'")
        self._values[key] = value

    def log(self, key: str, value: Any) -> None:
        self.events.append(EventLogEntry(key=key, value=value))

    def persist(self, path: Path) -> Path:
        path = path.resolve()
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {field: self._values.get(field) for field in self.definition.persist}
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return path

    def load_persisted(self, path: Path) -> None:
        if not path.exists():
            return
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, Mapping):
            raise ValueError("persisted state must be a mapping")
        for key, value in payload.items():
            if key in self.definition.fields:
                self._values[key] = value

    def artifact_path(self, name: str) -> Path:
        if name not in self.definition.artifacts:
            raise KeyError(f"unknown artifact '{name}'")
        root = self.artifact_root or Path("artifacts")
        root.mkdir(parents=True, exist_ok=True)
        return root / name


__all__ = ["StateDefinition", "StateStore", "StateFieldDefinition", "EventLogEntry"]
