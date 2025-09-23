"""Model registry utilities used by the YAML runtime."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Set

from .errors import ModelResolutionError, Provenance
from .loader import YAMLRegistry, normalize_ref
from .schema import DocumentKind
from .schema.documents import LLMConfig, ModelDocument


@dataclass(slots=True)
class ModelSpec:
    """Resolved model configuration ready for provider dispatch."""

    key: Optional[str]
    provider: str
    name: str
    params: Dict[str, Any]
    fallback_refs: List[str]
    namespace: Optional[str]
    provenance: Optional[Provenance]
    inline: bool = False

    @property
    def identity(self) -> str:
        if self.key:
            return self.key
        # Inline models are uniquely identified by provider/name combination.
        return f"inline::{self.provider}:{self.name}:{id(self)}"


class ModelRegistry:
    """Creates ``ModelSpec`` instances from YAML documents or inline configs."""

    def __init__(self, registry: YAMLRegistry) -> None:
        self.registry = registry

    def resolve(self, reference: str, namespace: Optional[str]) -> ModelSpec:
        """Resolve a ``model_ref`` into a ``ModelSpec``."""

        try:
            key = normalize_ref(reference, namespace)
        except ValueError as exc:  # pragma: no cover - defensive
            raise ModelResolutionError(str(exc)) from exc
        try:
            entry = self.registry.entry(key)
        except KeyError as exc:  # pragma: no cover - defensive
            raise ModelResolutionError(f"unknown model reference '{reference}'") from exc
        document = entry.document
        if document.kind is not DocumentKind.MODEL or not isinstance(document, ModelDocument):
            raise ModelResolutionError(
                f"reference '{reference}' does not point to a model document",
                entry.provenance,
            )
        return self._spec_from_document(document, key, entry.provenance)

    def from_inline(self, payload: Mapping[str, Any]) -> ModelSpec:
        """Create a ``ModelSpec`` from an inline configuration block."""

        if "provider" not in payload:
            raise ModelResolutionError("inline llm config requires 'provider'")
        provider = str(payload["provider"])
        name = str(payload.get("name") or payload.get("model") or "")
        if not name:
            raise ModelResolutionError("inline llm config requires 'name' or 'model'")
        params = self._copy_mapping(payload.get("params", {}))
        fallback_refs = [str(ref) for ref in payload.get("fallbacks", [])]
        return ModelSpec(
            key=None,
            provider=provider,
            name=name,
            params=params,
            fallback_refs=fallback_refs,
            namespace=None,
            provenance=None,
            inline=True,
        )

    def build_chain(
        self,
        llm_config: Optional[LLMConfig],
        persona_default_ref: Optional[str],
        namespace: Optional[str],
    ) -> List[ModelSpec]:
        """Return the ordered list of ``ModelSpec`` instances to try."""

        specs: List[ModelSpec] = []
        visited: Set[str] = set()
        if llm_config and llm_config.inline:
            inline_spec = self.from_inline(llm_config.inline)
            specs.append(inline_spec)
            visited.add(inline_spec.identity)
            specs.extend(self._expand_fallbacks(inline_spec, namespace, visited))
            return specs

        primary_ref = None
        if llm_config and llm_config.model_ref:
            primary_ref = llm_config.model_ref
        elif persona_default_ref:
            primary_ref = persona_default_ref
        if not primary_ref:
            return []
        primary_specs = self._expand_reference(primary_ref, namespace, visited)
        specs.extend(primary_specs)
        return specs

    def _expand_reference(
        self,
        reference: str,
        namespace: Optional[str],
        visited: Set[str],
    ) -> List[ModelSpec]:
        spec = self.resolve(reference, namespace)
        if spec.identity in visited:
            return []
        visited.add(spec.identity)
        result = [spec]
        result.extend(self._expand_fallbacks(spec, spec.namespace or namespace, visited))
        return result

    def _expand_fallbacks(
        self,
        spec: ModelSpec,
        namespace: Optional[str],
        visited: Set[str],
    ) -> List[ModelSpec]:
        expanded: List[ModelSpec] = []
        for fallback in spec.fallback_refs:
            expanded.extend(self._expand_reference(fallback, namespace, visited))
        return expanded

    @staticmethod
    def _spec_from_document(
        document: ModelDocument,
        key: str,
        provenance: Provenance,
    ) -> ModelSpec:
        params = ModelRegistry._copy_mapping(document.params)
        fallback_refs = [fallback.model_ref for fallback in document.fallbacks]
        return ModelSpec(
            key=key,
            provider=document.provider,
            name=document.name,
            params=params,
            fallback_refs=fallback_refs,
            namespace=document.namespace,
            provenance=provenance,
        )

    @staticmethod
    def _copy_mapping(value: Mapping[str, Any] | None) -> Dict[str, Any]:
        if value is None:
            return {}
        return {str(key): value[key] for key in value}


__all__ = ["ModelRegistry", "ModelSpec"]
