"""Concrete YAML document models for the LangGraph YAML runtime."""
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from .base import DocumentKind, YAMLDocument


class InlineSchema(BaseModel):
    """Wraps inline schema definitions for inputs or outputs."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["json-schema", "pydantic-model"] = Field(default="json-schema")
    value: Dict[str, Any] = Field(default_factory=dict)


class StateField(BaseModel):
    name: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    default: Any | None = None
    required: bool = False


class StateDocument(YAMLDocument):
    model_kind = DocumentKind.STATE
    kind: Literal[DocumentKind.STATE] = Field(default=DocumentKind.STATE)

    fields: List[StateField] = Field(default_factory=list)
    persist: List[str] = Field(default_factory=list)
    artifacts: List[str] = Field(default_factory=list)

    @staticmethod
    def _names(items: List[StateField]) -> List[str]:
        return [field.name for field in items]

    @staticmethod
    def _duplicates(names: List[str]) -> List[str]:
        seen: set[str] = set()
        dupes: List[str] = []
        for name in names:
            if name in seen and name not in dupes:
                dupes.append(name)
            seen.add(name)
        return dupes

    @staticmethod
    def _invalid_persist(names: List[str], persist: List[str]) -> List[str]:
        valid = set(names)
        return [item for item in persist if item not in valid]

    @staticmethod
    def _invalid_artifacts(artifacts: List[str]) -> List[str]:
        return [item for item in artifacts if not item]

    def model_post_init(self, __context: Any) -> None:  # type: ignore[override]
        names = self._names(self.fields)
        duplicates = self._duplicates(names)
        if duplicates:
            raise ValueError(f"duplicate state fields: {', '.join(duplicates)}")
        invalid_persist = self._invalid_persist(names, self.persist)
        if invalid_persist:
            raise ValueError(
                f"persist references unknown fields: {', '.join(invalid_persist)}"
            )
        invalid_artifacts = self._invalid_artifacts(self.artifacts)
        if invalid_artifacts:
            raise ValueError("artifact names must be non-empty strings")


class PersonaDocument(YAMLDocument):
    model_kind = DocumentKind.PERSONA
    kind: Literal[DocumentKind.PERSONA] = Field(default=DocumentKind.PERSONA)

    name: str
    description: str
    style: Optional[str] = None
    default_model_ref: Optional[str] = None
    tool_refs: List[str] = Field(default_factory=list)
    policy_refs: List[str] = Field(default_factory=list)


class ToolType(str, Enum):
    SHELL = "shell"
    HTTP = "http"
    CODE = "code"
    PYTHON = "python"
    SEARCH = "search"
    FILE = "file"
    CUSTOM = "custom"


class ToolDocument(YAMLDocument):
    model_kind = DocumentKind.TOOL
    kind: Literal[DocumentKind.TOOL] = Field(default=DocumentKind.TOOL)

    type: ToolType
    config: Dict[str, Any] = Field(default_factory=dict)
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    python_entrypoint: Optional[str] = None


class TemplateFormat(str, Enum):
    JINJA2 = "jinja2"
    FSTRING = "fstring"


class TemplateMessage(BaseModel):
    role: str
    content: str


class InlineTemplate(BaseModel):
    """Inline template payload embedded inside a task."""

    model_config = ConfigDict(extra="forbid")

    format: TemplateFormat = Field(default=TemplateFormat.JINJA2)
    system: Optional[str] = None
    user: Optional[str] = None
    messages: List[TemplateMessage] = Field(default_factory=list)
    vars: List[str] = Field(default_factory=list)
    extends: Optional[str] = None


class TemplateDocument(YAMLDocument):
    model_kind = DocumentKind.TEMPLATE
    kind: Literal[DocumentKind.TEMPLATE] = Field(default=DocumentKind.TEMPLATE)

    format: TemplateFormat = Field(default=TemplateFormat.JINJA2)
    system: Optional[str] = None
    user: Optional[str] = None
    messages: List[TemplateMessage] = Field(default_factory=list)
    vars: List[str] = Field(default_factory=list)
    extends: Optional[str] = None


class RetryConfig(BaseModel):
    max: int = Field(default=1, ge=1)
    backoff: float = Field(default=0.0, ge=0.0)


class StopConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    condition: Optional[Dict[str, Any]] = Field(default=None, alias="if")
    max_tokens: Optional[int] = Field(default=None, ge=1)


class ArtifactSpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    name: str
    source: Any = Field(alias="from")


class TaskWrites(BaseModel):
    state: Dict[str, Any] = Field(default_factory=dict)
    artifacts: List[ArtifactSpec] = Field(default_factory=list)


class LLMConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model_ref: Optional[str] = None
    inline: Optional[Dict[str, Any]] = None
    params: Dict[str, Any] = Field(default_factory=dict)


class TaskDocument(YAMLDocument):
    model_kind = DocumentKind.TASK
    kind: Literal[DocumentKind.TASK] = Field(default=DocumentKind.TASK)

    persona_ref: Optional[str] = None
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    template_ref: Optional[str] = None
    template: Optional[InlineTemplate] = None
    tool_refs: List[str] = Field(default_factory=list)
    llm: Optional[LLMConfig] = None
    retry: Optional[RetryConfig] = None
    stop: Optional[StopConfig] = None
    writes: TaskWrites = Field(default_factory=TaskWrites)
    emits: List[str] = Field(default_factory=list)

    def model_post_init(self, __context: Any) -> None:  # type: ignore[override]
        if not self.template_ref and not self.template:
            raise ValueError("task must define either template_ref or template")
        if self.template_ref and self.template:
            raise ValueError("task cannot define both template_ref and inline template")


class RouterType(str, Enum):
    SWITCH = "switch"
    PROBABILISTIC = "probabilistic"
    FUNCTION = "function"
    MAP = "map"


class RouterCase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    condition: Dict[str, Any] = Field(alias="if")
    to: str


class RouterDocument(YAMLDocument):
    model_kind = DocumentKind.ROUTER
    kind: Literal[DocumentKind.ROUTER] = Field(default=DocumentKind.ROUTER)

    type: RouterType
    when: Optional[Dict[str, Any]] = None
    cases: List[RouterCase] = Field(default_factory=list)

    def model_post_init(self, __context: Any) -> None:  # type: ignore[override]
        if self.type == RouterType.SWITCH and not self.cases:
            raise ValueError("switch router requires at least one case")
        if self.when and self.cases:
            raise ValueError("router cannot define both `when` and `cases`")


class WorkflowNode(BaseModel):
    task_ref: Optional[str] = None
    router_ref: Optional[str] = None
    subflow_ref: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:  # type: ignore[override]
        defined = [value for value in (self.task_ref, self.router_ref, self.subflow_ref) if value]
        if not defined:
            raise ValueError("workflow node must reference task_ref, router_ref, or subflow_ref")
        if len(defined) > 1:
            raise ValueError("workflow node cannot reference multiple targets")


class WorkflowEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    source: str = Field(alias="from")
    to: str
    when: Optional[Dict[str, Any]] = None


class WorkflowConcurrency(BaseModel):
    max_parallel: int = Field(default=1, ge=1)


class WorkflowDocument(YAMLDocument):
    model_kind = DocumentKind.WORKFLOW
    kind: Literal[DocumentKind.WORKFLOW] = Field(default=DocumentKind.WORKFLOW)

    state_ref: str
    entry: str
    nodes: Dict[str, WorkflowNode]
    edges: List[WorkflowEdge] = Field(default_factory=list)
    concurrency: Optional[WorkflowConcurrency] = None

    def model_post_init(self, __context: Any) -> None:  # type: ignore[override]
        if self.entry not in self.nodes:
            raise ValueError(f"workflow entry '{self.entry}' missing from nodes")
        for edge in self.edges:
            if edge.source not in self.nodes:
                raise ValueError(f"edge references unknown source node '{edge.source}'")
            if edge.to not in self.nodes:
                raise ValueError(f"edge references unknown destination node '{edge.to}'")


class PolicyAction(str, Enum):
    ALLOW = "allow"
    DENY = "deny"


class PolicyScope(str, Enum):
    TOOLS = "tools"
    FILES = "files"
    NETWORK = "network"


class PolicyRule(BaseModel):
    name: str
    action: PolicyAction
    on: PolicyScope
    when: Optional[Dict[str, Any]] = None
    tool_refs: List[str] = Field(default_factory=list)

    def model_post_init(self, __context: Any) -> None:  # type: ignore[override]
        if self.on is not PolicyScope.TOOLS and self.tool_refs:
            raise ValueError("tool_refs only valid when scope is 'tools'")


class PolicyDocument(YAMLDocument):
    model_kind = DocumentKind.POLICY
    kind: Literal[DocumentKind.POLICY] = Field(default=DocumentKind.POLICY)

    rules: List[PolicyRule] = Field(default_factory=list)

    def model_post_init(self, __context: Any) -> None:  # type: ignore[override]
        if not self.rules:
            raise ValueError("policy must include at least one rule")


class ModelFallback(BaseModel):
    model_ref: str


class ModelDocument(YAMLDocument):
    model_kind = DocumentKind.MODEL
    kind: Literal[DocumentKind.MODEL] = Field(default=DocumentKind.MODEL)

    provider: str
    name: str
    params: Dict[str, Any] = Field(default_factory=dict)
    fallbacks: List[ModelFallback] = Field(default_factory=list)


class KnowledgeSourceType(str, Enum):
    FILE = "file"
    DIR = "dir"
    URL = "url"
    MARKDOWN = "md"
    YAML = "yaml"


class KnowledgeSource(BaseModel):
    type: KnowledgeSourceType
    path: Optional[str] = None
    url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    def model_post_init(self, __context: Any) -> None:  # type: ignore[override]
        if self.type in {KnowledgeSourceType.FILE, KnowledgeSourceType.DIR, KnowledgeSourceType.MARKDOWN, KnowledgeSourceType.YAML} and not self.path:
            raise ValueError("knowledge source requires `path`")
        if self.type is KnowledgeSourceType.URL and not self.url:
            raise ValueError("url knowledge source requires `url`")


class KnowledgeIngestConfig(BaseModel):
    chunk: Optional[int] = Field(default=None, ge=1)
    embed_model_ref: Optional[str] = None


class KnowledgeDocument(YAMLDocument):
    model_kind = DocumentKind.KNOWLEDGE
    kind: Literal[DocumentKind.KNOWLEDGE] = Field(default=DocumentKind.KNOWLEDGE)

    sources: List[KnowledgeSource] = Field(default_factory=list)
    ingest: Optional[KnowledgeIngestConfig] = None


class PackageDocument(YAMLDocument):
    model_kind = DocumentKind.PACKAGE
    kind: Literal[DocumentKind.PACKAGE] = Field(default=DocumentKind.PACKAGE)

    description: Optional[str] = None
    imports: List[str] = Field(default_factory=list)
    default_namespace: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:  # type: ignore[override]
        if self.default_namespace and ":" in self.default_namespace:
            raise ValueError("namespace must not contain colon characters")


DOCUMENT_MODELS = {
    DocumentKind.STATE: StateDocument,
    DocumentKind.PERSONA: PersonaDocument,
    DocumentKind.TOOL: ToolDocument,
    DocumentKind.TEMPLATE: TemplateDocument,
    DocumentKind.TASK: TaskDocument,
    DocumentKind.ROUTER: RouterDocument,
    DocumentKind.WORKFLOW: WorkflowDocument,
    DocumentKind.POLICY: PolicyDocument,
    DocumentKind.MODEL: ModelDocument,
    DocumentKind.KNOWLEDGE: KnowledgeDocument,
    DocumentKind.PACKAGE: PackageDocument,
}


DOCUMENT_MODEL_LIST = list(DOCUMENT_MODELS.values())


__all__ = [
    "ArtifactSpec",
    "DOCUMENT_MODELS",
    "DOCUMENT_MODEL_LIST",
    "InlineSchema",
    "InlineTemplate",
    "KnowledgeDocument",
    "KnowledgeIngestConfig",
    "KnowledgeSource",
    "KnowledgeSourceType",
    "ModelDocument",
    "ModelFallback",
    "PackageDocument",
    "PersonaDocument",
    "PolicyDocument",
    "PolicyRule",
    "RouterCase",
    "RouterDocument",
    "RouterType",
    "StateDocument",
    "StateField",
    "TaskDocument",
    "TaskWrites",
    "TemplateDocument",
    "TemplateFormat",
    "TemplateMessage",
    "ToolDocument",
    "ToolType",
    "WorkflowConcurrency",
    "WorkflowDocument",
    "WorkflowEdge",
    "WorkflowNode",
]
