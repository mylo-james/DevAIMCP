"""Compile YAML documents into an executable workflow runtime."""
from __future__ import annotations

from dataclasses import dataclass, field
import json
from pathlib import Path
from typing import Any, Dict, List, Mapping, MutableMapping, Optional, Tuple

from .conditions import ConditionContext, ConditionEvaluator
from .errors import YAMLRuntimeError
from .loader import YAMLRegistry, normalize_ref
from .llm import LLMRuntime
from .models import ModelRegistry
from .policy import PolicyEngine
from .schema import YAMLDocument, make_document_key, DocumentKind
from .schema.documents import (
    PersonaDocument,
    RouterDocument,
    RouterType,
    StateDocument,
    TaskDocument,
    TemplateDocument,
    ToolDocument,
    WorkflowDocument,
    WorkflowEdge,
    WorkflowNode,
)
from .state import StateDefinition, StateStore
from .templates import RenderedPrompt, TemplateEngine
from .tools import ToolContext, ToolRegistry


_JSONLOGIC_OPERATORS: set[str] = {
    "var",
    "has",
    "!",
    "not",
    "and",
    "all",
    "or",
    "any",
    "==",
    "equals",
    "!=",
    "distinct",
    ">",
    "gt",
    "<",
    "lt",
    ">=",
    "gte",
    "<=",
    "lte",
    "contains",
    "concat",
    "join",
    "if",
}


@dataclass(slots=True)
class TaskResult:
    node_id: str
    prompt: RenderedPrompt
    output: Mapping[str, Any]
    artifacts: Dict[str, Path]


@dataclass(slots=True)
class RouterResult:
    node_id: str
    selected: Optional[str]


@dataclass(slots=True)
class WorkflowTraceEntry:
    node_id: str
    node_kind: str
    state_snapshot: Mapping[str, Any]
    result: Mapping[str, Any]


@dataclass(slots=True)
class WorkflowResult:
    final_state: Mapping[str, Any]
    artifacts: Dict[str, Path]
    trace: List[WorkflowTraceEntry]


@dataclass(slots=True)
class RunOptions:
    max_steps: int = 128
    artifacts_dir: Optional[Path] = None
    env: Mapping[str, Any] = field(default_factory=dict)
    stream: bool = False


class WorkflowRunner:
    def __init__(
        self,
        registry: YAMLRegistry,
        workflow: WorkflowDocument,
        state_definition: StateDefinition,
        template_engine: TemplateEngine,
        tool_registry: ToolRegistry,
        llm_runtime: LLMRuntime,
    ) -> None:
        self.registry = registry
        self.workflow = workflow
        self.state_definition = state_definition
        self.template_engine = template_engine
        self.tool_registry = tool_registry
        self.llm_runtime = llm_runtime
        self.edges_by_source: Dict[str, List[WorkflowEdge]] = self._group_edges(workflow.edges)
        self.trace: List[WorkflowTraceEntry] = []
        self.artifacts: Dict[str, Path] = {}
        self.policy_cache: Dict[str, PolicyEngine] = {}

    @staticmethod
    def _group_edges(edges: List[WorkflowEdge]) -> Dict[str, List[WorkflowEdge]]:
        grouped: Dict[str, List[WorkflowEdge]] = {}
        for edge in edges:
            grouped.setdefault(edge.source, []).append(edge)
        return grouped

    def run(self, inputs: Mapping[str, Any], options: Optional[RunOptions] = None) -> WorkflowResult:
        options = options or RunOptions()
        self.trace.clear()
        self.artifacts.clear()
        state_store = StateStore(
            self.state_definition,
            initial=None,
            artifact_root=options.artifacts_dir,
        )
        current = self.workflow.entry
        namespace = self.workflow.namespace
        last_result: Mapping[str, Any] | None = None
        steps = 0
        while current:
            steps += 1
            if steps > options.max_steps:
                raise YAMLRuntimeError("workflow exceeded maximum step count")
            node = self.workflow.nodes[current]
            if node.task_ref:
                task_result = self._run_task(
                    current,
                    node,
                    inputs,
                    state_store,
                    namespace,
                    last_result,
                    options,
                )
                last_result = task_result.output
                current = self._next_node(current, state_store, inputs, task_result.output)
            elif node.router_ref:
                router_result = self._run_router(
                    current,
                    node,
                    inputs,
                    state_store,
                    namespace,
                    last_result,
                    options,
                )
                last_result = {"selected": router_result.selected}
                if router_result.selected:
                    current = router_result.selected
                else:
                    current = self._next_node(current, state_store, inputs, last_result)
            else:
                raise YAMLRuntimeError(f"workflow node '{current}' missing task or router reference")
        return WorkflowResult(
            final_state=state_store.to_dict(),
            artifacts=dict(self.artifacts),
            trace=list(self.trace),
        )

    def _evaluate_expression(
        self,
        expression: Any,
        state_store: StateStore,
        inputs: Mapping[str, Any],
        result: Mapping[str, Any] | None,
        env: Mapping[str, Any],
        namespace: Optional[str],
        policy_engine: PolicyEngine,
        options: RunOptions,
    ) -> Any:
        evaluator = ConditionEvaluator(
            ConditionContext(
                state=state_store.to_dict(),
                inputs=inputs,
                result=result,
                env=env,
            )
        )
        if isinstance(expression, dict):
            if "call_tool" in expression:
                return self._invoke_tool(
                    expression["call_tool"],
                    state_store,
                    inputs,
                    result,
                    env,
                    namespace,
                    policy_engine,
                    options,
                )
            return evaluator.evaluate_value(expression)
        if isinstance(expression, list):
            return evaluator.evaluate_value(expression)
        if isinstance(expression, str):
            return evaluator.evaluate_value({"var": expression})
        return expression

    def _invoke_tool(
        self,
        spec: Any,
        state_store: StateStore,
        inputs: Mapping[str, Any],
        result: Mapping[str, Any] | None,
        env: Mapping[str, Any],
        namespace: Optional[str],
        policy_engine: PolicyEngine,
        options: RunOptions,
    ) -> Any:
        if not isinstance(spec, Mapping):
            raise YAMLRuntimeError("call_tool specification must be a mapping")
        ref = spec.get("ref") or spec.get("tool")
        if not isinstance(ref, str):
            raise YAMLRuntimeError("call_tool requires 'ref' string")
        payload_expr = spec.get("payload") or spec.get("with") or spec.get("input") or {}
        payload = self._evaluate_tool_value(
            payload_expr,
            state_store,
            inputs,
            result,
            env,
            namespace,
            policy_engine,
            options,
        )
        if not isinstance(payload, Mapping):
            raise YAMLRuntimeError("tool payload must evaluate to a mapping")
        tool_key = normalize_ref(ref, namespace)
        entry = self.registry.entry(tool_key)
        document = entry.document
        if not isinstance(document, ToolDocument):
            raise YAMLRuntimeError(
                f"reference '{ref}' does not resolve to a tool document",
                entry.provenance,
            )
        policy_engine.assert_tool_allowed(
            tool_key,
            document,
            state=state_store.to_dict(),
            inputs=inputs,
            result=result,
            env=env,
            payload=payload,
        )
        artifact_root = options.artifacts_dir or state_store.artifact_root or Path("artifacts")
        artifact_root.mkdir(parents=True, exist_ok=True)
        context = ToolContext(
            state=state_store,
            inputs=inputs,
            env=env,
            artifacts=artifact_root,
        )
        return self.tool_registry.invoke(document, payload, context)

    def _evaluate_tool_value(
        self,
        value: Any,
        state_store: StateStore,
        inputs: Mapping[str, Any],
        result: Mapping[str, Any] | None,
        env: Mapping[str, Any],
        namespace: Optional[str],
        policy_engine: PolicyEngine,
        options: RunOptions,
    ) -> Any:
        if isinstance(value, Mapping):
            if "call_tool" in value:
                return self._invoke_tool(
                    value["call_tool"],
                    state_store,
                    inputs,
                    result,
                    env,
                    namespace,
                    policy_engine,
                    options,
                )
            if len(value) == 1 and next(iter(value)) in _JSONLOGIC_OPERATORS:
                return self._evaluate_expression(
                    value,
                    state_store,
                    inputs,
                    result,
                    env,
                    namespace,
                    policy_engine,
                    options,
                )
            return {
                key: self._evaluate_tool_value(
                    item,
                    state_store,
                    inputs,
                    result,
                    env,
                    namespace,
                    policy_engine,
                    options,
                )
                for key, item in value.items()
            }
        if isinstance(value, list):
            return [
                self._evaluate_tool_value(
                    item,
                    state_store,
                    inputs,
                    result,
                    env,
                    namespace,
                    policy_engine,
                    options,
                )
                for item in value
            ]
        return value

    def _run_task(
        self,
        node_id: str,
        node: WorkflowNode,
        inputs: Mapping[str, Any],
        state_store: StateStore,
        namespace: Optional[str],
        last_result: Mapping[str, Any] | None,
        options: RunOptions,
    ) -> TaskResult:
        task_key = normalize_ref(node.task_ref, namespace)
        task_doc = self.registry.entry(task_key).document
        assert isinstance(task_doc, TaskDocument)  # noqa: S101 - defensive
        persona_context, persona_doc = self._load_persona(task_doc.persona_ref, namespace)
        render_context = {
            "state": state_store.to_dict(),
            "inputs": inputs,
            "persona": persona_context,
            "tools": task_doc.tool_refs,
            "env": dict(options.env),
            "knowledge": {},
        }
        task_namespace = task_doc.namespace or namespace
        if task_doc.template_ref:
            template_key = normalize_ref(task_doc.template_ref, task_namespace)
            prompt = self.template_engine.render_by_ref(template_key, render_context)
        elif task_doc.template:
            prompt = self.template_engine.render(task_doc.template, render_context)
        else:
            raise YAMLRuntimeError(f"task '{task_key}' missing template definition")
        llm_call = self.llm_runtime.invoke(
            task_doc,
            persona_doc,
            prompt,
            namespace=task_namespace,
            state_store=state_store,
            inputs=inputs,
            env=dict(options.env),
            stream=options.stream,
        )
        policy_engine = self._get_policy_engine(persona_doc, task_namespace)
        if llm_call:
            result_payload = dict(llm_call.payload)
            response = result_payload.setdefault("response", {})
            response["model_key"] = llm_call.spec.key
            response["inline"] = llm_call.spec.inline
            response["namespace"] = llm_call.spec.namespace
        else:
            result_payload = {"response": None}
        result_payload["prompt"] = prompt.messages
        self._apply_writes(
            task_doc,
            state_store,
            inputs,
            result_payload,
            options,
            task_namespace,
            policy_engine,
        )
        if task_doc.emits:
            for event in task_doc.emits:
                state_store.log(event, result_payload)
        trace_entry = WorkflowTraceEntry(
            node_id=node_id,
            node_kind="task",
            state_snapshot=state_store.to_dict(),
            result=result_payload,
        )
        self.trace.append(trace_entry)
        return TaskResult(node_id=node_id, prompt=prompt, output=result_payload, artifacts={})

    def _apply_writes(
        self,
        task: TaskDocument,
        state_store: StateStore,
        inputs: Mapping[str, Any],
        result_payload: Mapping[str, Any],
        options: RunOptions,
        task_namespace: Optional[str],
        policy_engine: PolicyEngine,
    ) -> None:
        context_env = dict(options.env)
        for field, expr in task.writes.state.items():
            value = self._evaluate_expression(
                expr,
                state_store,
                inputs,
                result_payload,
                context_env,
                task_namespace,
                policy_engine,
                options,
            )
            state_store.set(field, value)
        for artifact in task.writes.artifacts:
            content = self._evaluate_expression(
                artifact.source,
                state_store,
                inputs,
                result_payload,
                context_env,
                task_namespace,
                policy_engine,
                options,
            )
            path = state_store.artifact_path(artifact.name)
            if isinstance(content, (dict, list)):
                serialized = json.dumps(content, indent=2, ensure_ascii=False)
            else:
                serialized = str(content)
            path.write_text(serialized + "\n", encoding="utf-8")
            self.artifacts[artifact.name] = path

    def _run_router(
        self,
        node_id: str,
        node: WorkflowNode,
        inputs: Mapping[str, Any],
        state_store: StateStore,
        namespace: Optional[str],
        last_result: Mapping[str, Any] | None,
        options: RunOptions,
    ) -> RouterResult:
        router_key = normalize_ref(node.router_ref, namespace)
        router_doc = self.registry.entry(router_key).document
        assert isinstance(router_doc, RouterDocument)  # noqa: S101 - defensive
        evaluator = ConditionEvaluator(
            ConditionContext(
                state=state_store.to_dict(),
                inputs=inputs,
                result=last_result,
                env=dict(options.env),
            )
        )
        selected: Optional[str] = None
        if router_doc.type == RouterType.SWITCH:
            for case in router_doc.cases:
                if evaluator.evaluate(case.condition):
                    selected = case.to
                    break
        elif router_doc.when:
            if evaluator.evaluate(router_doc.when):
                edges = self.edges_by_source.get(node_id, [])
                if edges:
                    selected = edges[0].to
        trace_entry = WorkflowTraceEntry(
            node_id=node_id,
            node_kind="router",
            state_snapshot=state_store.to_dict(),
            result={"selected": selected},
        )
        self.trace.append(trace_entry)
        return RouterResult(node_id=node_id, selected=selected)

    def _next_node(
        self,
        node_id: str,
        state_store: StateStore,
        inputs: Mapping[str, Any],
        result: Mapping[str, Any] | None,
    ) -> Optional[str]:
        edges = self.edges_by_source.get(node_id, [])
        if not edges:
            return None
        evaluator = ConditionEvaluator(
            ConditionContext(
                state=state_store.to_dict(),
                inputs=inputs,
                result=result,
                env={},
            )
        )
        for edge in edges:
            if edge.when is None or evaluator.evaluate(edge.when):
                return edge.to
        return None

    def _load_persona(
        self, persona_ref: Optional[str], namespace: Optional[str]
    ) -> tuple[Mapping[str, Any], Optional[PersonaDocument]]:
        if not persona_ref:
            return {}, None
        key = normalize_ref(persona_ref, namespace)
        document = self.registry.entry(key).document
        if isinstance(document, PersonaDocument):
            return document.model_dump(), document
        return {}, None

    def _get_policy_engine(
        self,
        persona: Optional[PersonaDocument],
        namespace: Optional[str],
    ) -> PolicyEngine:
        if not persona or not persona.policy_refs:
            return PolicyEngine(())
        cache_key = make_document_key(persona.namespace, DocumentKind.PERSONA, persona.id)
        if cache_key not in self.policy_cache:
            default_namespace = persona.namespace or namespace
            engine = PolicyEngine.from_refs(self.registry, persona.policy_refs, default_namespace)
            self.policy_cache[cache_key] = engine
        return self.policy_cache[cache_key]


class WorkflowBuilder:
    """High-level facade for building workflow runners from the registry."""

    def __init__(self, registry: YAMLRegistry) -> None:
        self.registry = registry

    def build(self, workflow_ref: str, artifacts_dir: Optional[Path] = None) -> WorkflowRunner:
        workflow_doc, workflow_key = self._resolve_document(workflow_ref, DocumentKind.WORKFLOW)
        if not isinstance(workflow_doc, WorkflowDocument):
            raise YAMLRuntimeError(f"reference '{workflow_ref}' is not a workflow")
        state_doc, _ = self._resolve_document(
            workflow_doc.state_ref,
            DocumentKind.STATE,
            default_namespace=workflow_doc.namespace,
        )
        if not isinstance(state_doc, StateDocument):
            raise YAMLRuntimeError("workflow state_ref does not resolve to a state document")
        state_definition = StateDefinition.from_document(state_doc)
        templates = self._collect_templates()
        template_engine = TemplateEngine(templates)
        tool_registry = ToolRegistry()
        model_registry = ModelRegistry(self.registry)
        llm_runtime = LLMRuntime(model_registry)
        runner = WorkflowRunner(
            self.registry,
            workflow_doc,
            state_definition,
            template_engine,
            tool_registry,
            llm_runtime,
        )
        if artifacts_dir:
            runner.artifacts = {}
        return runner

    def _collect_templates(self) -> Dict[str, TemplateDocument]:
        templates: Dict[str, TemplateDocument] = {}
        for key, entry in self.registry.items():
            document = entry.document
            if isinstance(document, TemplateDocument):
                template_key = make_document_key(document.namespace, DocumentKind.TEMPLATE, document.id)
                templates[template_key] = document
                templates.setdefault(document.id, document)
        return templates

    def _resolve_document(
        self,
        reference: str,
        kind: DocumentKind,
        default_namespace: Optional[str] = None,
    ) -> tuple[YAMLDocument, str]:
        candidates: List[str] = []
        try:
            normalized = normalize_ref(reference, default_namespace)
            candidates.append(normalized)
        except ValueError:
            pass
        if ":" not in reference:
            expanded = f"{kind.value}:{reference}"
            try:
                candidates.append(normalize_ref(expanded, default_namespace))
            except ValueError:
                pass
        for key in candidates:
            try:
                entry = self.registry.entry(key)
            except KeyError:
                continue
            document = entry.document
            if document.kind == kind:
                return document, key
        identifier = reference.split(":")[-1]
        for key, entry in self.registry.items():
            document = entry.document
            if document.kind == kind and document.id == identifier:
                return document, key
        raise YAMLRuntimeError(f"unable to resolve {kind.value} reference '{reference}'")


__all__ = ["RunOptions", "WorkflowBuilder", "WorkflowRunner", "WorkflowResult"]
