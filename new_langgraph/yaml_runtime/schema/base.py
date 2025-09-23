"""Pydantic models that back the YAML runtime schema."""
from __future__ import annotations

from enum import Enum
import re
from typing import Any, ClassVar, Dict, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


SCHEMA_VERSION: Literal["v1"] = "v1"


class DocumentKind(str, Enum):
    """Enumerates supported YAML document kinds."""

    PERSONA = "persona"
    TASK = "task"
    WORKFLOW = "workflow"
    TOOL = "tool"
    TEMPLATE = "template"
    MODEL = "model"
    POLICY = "policy"
    STATE = "state"
    KNOWLEDGE = "knowledge"
    ROUTER = "router"
    PACKAGE = "package"


_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]+$")


class YAMLDocument(BaseModel):
    """Base fields shared by every YAML document."""

    model_config = ConfigDict(extra="forbid", validate_assignment=True)

    version: Literal[SCHEMA_VERSION] = Field(default=SCHEMA_VERSION)
    kind: DocumentKind
    id: str = Field(..., min_length=1, pattern=_ID_PATTERN.pattern)
    namespace: Optional[str] = Field(default=None, pattern=_ID_PATTERN.pattern)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # Sub-classes should set this to enforce their kind value.
    model_kind: ClassVar[Optional[DocumentKind]] = None

    @model_validator(mode="after")
    def _validate_kind(self) -> "YAMLDocument":
        expected = getattr(self, "model_kind", None)
        if expected is not None and self.kind != expected:
            raise ValueError(f"document kind must be '{expected.value}'")
        return self


__all__ = ["SCHEMA_VERSION", "DocumentKind", "YAMLDocument"]
