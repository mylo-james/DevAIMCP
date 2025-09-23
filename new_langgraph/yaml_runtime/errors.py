"""Custom exceptions raised by the YAML runtime."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Provenance:
    path: Path
    line: int

    def format(self) -> str:
        return f"{self.path}:{self.line}"


class YAMLRuntimeError(RuntimeError):
    """Base error for YAML runtime issues."""

    def __init__(self, message: str, provenance: Provenance | None = None) -> None:
        if provenance:
            super().__init__(f"{message} ({provenance.format()})")
        else:
            super().__init__(message)
        self.provenance = provenance


class DuplicateDocumentError(YAMLRuntimeError):
    pass


class MissingReferenceError(YAMLRuntimeError):
    pass


class ReferenceCycleError(YAMLRuntimeError):
    pass


class InvalidImportError(YAMLRuntimeError):
    pass


class ModelResolutionError(YAMLRuntimeError):
    """Raised when a model reference cannot be resolved or used."""


class LLMInvocationError(YAMLRuntimeError):
    """Raised when an LLM provider fails to return a usable response."""


class StopConditionError(YAMLRuntimeError):
    """Raised when a stop condition is not satisfied after an LLM call."""


class PolicyViolationError(YAMLRuntimeError):
    """Raised when a runtime action is blocked by policy rules."""


__all__ = [
    "DuplicateDocumentError",
    "InvalidImportError",
    "LLMInvocationError",
    "PolicyViolationError",
    "MissingReferenceError",
    "ModelResolutionError",
    "Provenance",
    "ReferenceCycleError",
    "StopConditionError",
    "YAMLRuntimeError",
]
