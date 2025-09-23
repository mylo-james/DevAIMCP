"""Policy evaluation helpers for YAML runtime execution."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence

from .conditions import ConditionContext, ConditionEvaluator
from .errors import PolicyViolationError, YAMLRuntimeError, Provenance
from .loader import YAMLRegistry, normalize_ref
from .schema import DocumentKind, make_document_key
from .schema.documents import PolicyAction, PolicyDocument, PolicyScope, ToolDocument


@dataclass(slots=True)
class CompiledToolRule:
    name: str
    action: PolicyAction
    condition: Optional[Dict[str, Any]]
    tool_keys: Optional[set[str]]
    provenance: Optional[Provenance]

    def matches_tool(self, tool_key: str, tool_document: ToolDocument) -> bool:
        if self.tool_keys is None:
            return True
        if tool_key in self.tool_keys:
            return True
        fallback_key = make_document_key(tool_document.namespace, DocumentKind.TOOL, tool_document.id)
        return fallback_key in self.tool_keys


class PolicyEngine:
    """Evaluates policy rules for runtime actions."""

    def __init__(self, rules: Sequence[CompiledToolRule]) -> None:
        self.tool_rules: List[CompiledToolRule] = list(rules)

    @classmethod
    def from_refs(
        cls,
        registry: YAMLRegistry,
        references: Iterable[str],
        default_namespace: Optional[str],
    ) -> "PolicyEngine":
        compiled: List[CompiledToolRule] = []
        for ref in references:
            key = normalize_ref(ref, default_namespace)
            entry = registry.entry(key)
            document = entry.document
            if not isinstance(document, PolicyDocument):
                raise YAMLRuntimeError(
                    f"reference '{ref}' does not resolve to a policy document",
                    entry.provenance,
                )
            compiled.extend(_compile_policy(document, entry.provenance))
        return cls(compiled)

    def assert_tool_allowed(
        self,
        tool_key: str,
        tool_document: ToolDocument,
        *,
        state: Mapping[str, Any],
        inputs: Mapping[str, Any],
        result: Mapping[str, Any] | None,
        env: Mapping[str, Any],
        payload: Mapping[str, Any],
    ) -> None:
        if not self.tool_rules:
            return
        context_env = dict(env)
        context_env.setdefault("tool_payload", payload)
        context_env.setdefault("tool_id", tool_document.id)
        context_env.setdefault("tool_namespace", tool_document.namespace)
        evaluator = ConditionEvaluator(
            ConditionContext(
                state=state,
                inputs=inputs,
                result=result,
                env=context_env,
            )
        )
        matched = False
        allow_found = False
        for rule in self.tool_rules:
            if not rule.matches_tool(tool_key, tool_document):
                continue
            matched = True
            if rule.condition and not evaluator.evaluate(rule.condition):
                continue
            if rule.action is PolicyAction.DENY:
                provenance = f" ({rule.provenance.format()})" if rule.provenance else ""
                message = f"Policy '{rule.name}' denied tool '{tool_document.id}'{provenance}"
                raise PolicyViolationError(message)
            if rule.action is PolicyAction.ALLOW:
                allow_found = True
        if matched and not allow_found:
            message = f"No policy allow rule satisfied for tool '{tool_document.id}'"
            raise PolicyViolationError(message)


def _compile_policy(document: PolicyDocument, provenance: Any) -> List[CompiledToolRule]:
    rules: List[CompiledToolRule] = []
    for rule in document.rules:
        if rule.on is not PolicyScope.TOOLS:
            continue
        tool_keys: Optional[set[str]] = None
        if rule.tool_refs:
            tool_keys = set()
            for ref in rule.tool_refs:
                normalized = normalize_ref(ref, document.namespace)
                tool_keys.add(normalized)
        rules.append(
            CompiledToolRule(
                name=rule.name,
                action=rule.action,
                condition=rule.when,
                tool_keys=tool_keys,
                provenance=provenance,
            )
        )
    return rules
