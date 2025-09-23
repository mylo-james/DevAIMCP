"""Versioning helpers for YAML schema migrations."""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Callable, Deque, Dict, Iterable, List, Mapping, MutableMapping, Tuple

from .base import SCHEMA_VERSION

MigrationHandler = Callable[[MutableMapping[str, object]], MutableMapping[str, object]]


@dataclass(frozen=True)
class MigrationKey:
    source: str
    target: str


class MigrationRegistry:
    """Keeps track of version-to-version migration functions."""

    def __init__(self) -> None:
        self._handlers: Dict[MigrationKey, MigrationHandler] = {}

    def register(self, source: str, target: str, handler: MigrationHandler) -> None:
        self._handlers[MigrationKey(source, target)] = handler

    def path(self, source: str, target: str) -> List[MigrationHandler]:
        if source == target:
            return []

        queue: Deque[Tuple[str, List[MigrationHandler]]] = deque([(source, [])])
        visited = {source}
        while queue:
            version, handlers = queue.popleft()
            for key, handler in self._handlers.items():
                if key.source != version or key.target in visited:
                    continue
                new_handlers = [*handlers, handler]
                if key.target == target:
                    return new_handlers
                visited.add(key.target)
                queue.append((key.target, new_handlers))
        raise ValueError(f"no migration path from {source} to {target}")

    def migrate(
        self, payload: MutableMapping[str, object], target: str = SCHEMA_VERSION
    ) -> MutableMapping[str, object]:
        source = str(payload.get("version") or target)
        handlers = self.path(source, target)
        current: MutableMapping[str, object] = payload
        for handler in handlers:
            current = handler(current)
        current["version"] = target
        return current

    def __bool__(self) -> bool:  # Allows easy truthiness checks
        return bool(self._handlers)


GLOBAL_MIGRATIONS = MigrationRegistry()


def register_migration(source: str, target: str) -> Callable[[MigrationHandler], MigrationHandler]:
    """Decorator for adding migrations to the global registry."""

    def decorator(handler: MigrationHandler) -> MigrationHandler:
        GLOBAL_MIGRATIONS.register(source, target, handler)
        return handler

    return decorator


def apply_migrations(payload: MutableMapping[str, object], target: str = SCHEMA_VERSION):
    """Apply registered migrations to reach the target schema version."""

    if not GLOBAL_MIGRATIONS:
        payload["version"] = target
        return payload
    return GLOBAL_MIGRATIONS.migrate(payload, target=target)


__all__ = ["GLOBAL_MIGRATIONS", "MigrationRegistry", "apply_migrations", "register_migration"]
