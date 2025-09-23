"""LLM invocation engine for YAML-defined workflows."""
from __future__ import annotations

from dataclasses import dataclass, field
import json
import time
from typing import Any, Dict, List, Mapping, Optional, Type

import jsonschema

from .conditions import ConditionContext, ConditionEvaluator
from .errors import LLMInvocationError, ModelResolutionError, StopConditionError, YAMLRuntimeError
from .models import ModelRegistry, ModelSpec
from .schema.documents import LLMConfig, PersonaDocument, StopConfig, TaskDocument
from .state import StateStore
from .templates import RenderedPrompt


@dataclass(slots=True)
class LLMInvocationOptions:
    stream: bool = False
    max_tokens: Optional[int] = None


@dataclass(slots=True)
class LLMGeneration:
    content: str
    raw: Any
    model: str
    provider: str
    chunks: List[str] = field(default_factory=list)
    usage: Optional[Mapping[str, Any]] = None


class BaseLLMProvider:
    """Provider interface invoked with a rendered prompt."""

    def __init__(self, spec: ModelSpec) -> None:
        self.spec = spec

    def generate(
        self,
        prompt: RenderedPrompt,
        params: Mapping[str, Any],
        options: LLMInvocationOptions,
    ) -> LLMGeneration:
        raise NotImplementedError


class EchoProvider(BaseLLMProvider):
    """Deterministic provider used for testing and local development."""

    def generate(
        self,
        prompt: RenderedPrompt,
        params: Mapping[str, Any],
        options: LLMInvocationOptions,
    ) -> LLMGeneration:
        if params.get("force_failure"):
            raise LLMInvocationError("echo provider configured to fail")
        prefix = str(params.get("response_prefix", ""))
        if "response" in params:
            response_text = str(params["response"])
        else:
            if prompt.messages:
                response_text = prompt.messages[-1]["content"]
            else:
                response_text = ""
        content = f"{prefix}{response_text}"
        usage = params.get("usage") if isinstance(params.get("usage"), Mapping) else None
        chunks: List[str] = []
        if options.stream:
            chunk_size = int(params.get("chunk_size", 0))
            if chunk_size > 0 and content:
                chunks = [content[i : i + chunk_size] for i in range(0, len(content), chunk_size)]
            elif content:
                chunks = [content]
        raw: Any
        if params.get("format") == "json":
            key = str(params.get("json_key", "answer"))
            payload = {key: content}
            raw = payload
            content = json.dumps(payload, ensure_ascii=False)
        else:
            raw = content
        return LLMGeneration(
            content=content,
            raw=raw,
            model=self.spec.name,
            provider=self.spec.provider,
            chunks=chunks,
            usage=usage,
        )


DEFAULT_PROVIDERS: Dict[str, Type[BaseLLMProvider]] = {
    "echo": EchoProvider,
}


@dataclass(slots=True)
class LLMCallResult:
    payload: Dict[str, Any]
    spec: ModelSpec
    params: Mapping[str, Any]


class LLMRuntime:
    """Coordinates model resolution, provider dispatch, and result validation."""

    def __init__(
        self,
        model_registry: ModelRegistry,
        providers: Optional[Dict[str, Type[BaseLLMProvider]]] = None,
    ) -> None:
        self.model_registry = model_registry
        self.providers = dict(DEFAULT_PROVIDERS)
        if providers:
            self.providers.update(providers)

    def invoke(
        self,
        task: TaskDocument,
        persona: Optional[PersonaDocument],
        prompt: RenderedPrompt,
        *,
        namespace: Optional[str],
        state_store: StateStore,
        inputs: Mapping[str, Any],
        env: Mapping[str, Any],
        stream: bool = False,
    ) -> Optional[LLMCallResult]:
        llm_config: Optional[LLMConfig] = task.llm
        persona_default_ref = persona.default_model_ref if persona else None
        model_specs = self.model_registry.build_chain(llm_config, persona_default_ref, namespace)
        if not model_specs:
            return None
        max_attempts = task.retry.max if task.retry else 1
        backoff = task.retry.backoff if task.retry else 0.0
        last_error: Optional[Exception] = None
        for attempt in range(1, max_attempts + 1):
            for spec in model_specs:
                try:
                    provider = self._provider_for_spec(spec)
                except ModelResolutionError as exc:
                    last_error = exc
                    continue
                params = self._merge_params(spec, llm_config)
                options = LLMInvocationOptions(
                    stream=stream,
                    max_tokens=task.stop.max_tokens if task.stop else None,
                )
                try:
                    generation = provider.generate(prompt, params, options)
                    payload = self._build_payload(task, generation, params)
                    if task.stop and task.stop.condition:
                        if not self._evaluate_stop(task.stop, state_store, inputs, payload, env):
                            raise StopConditionError("LLM stop condition not satisfied")
                    return LLMCallResult(payload=payload, spec=spec, params=params)
                except (LLMInvocationError, StopConditionError) as exc:
                    last_error = exc
                    continue
            if attempt < max_attempts and backoff > 0:
                time.sleep(backoff)
        if last_error:
            raise YAMLRuntimeError(f"LLM invocation failed: {last_error}") from last_error
        raise YAMLRuntimeError("LLM invocation failed without a specific error")

    def _provider_for_spec(self, spec: ModelSpec) -> BaseLLMProvider:
        provider_cls = self.providers.get(spec.provider)
        if not provider_cls:
            message = f"no LLM provider registered for '{spec.provider}'"
            raise ModelResolutionError(message, spec.provenance)
        return provider_cls(spec)

    @staticmethod
    def _merge_params(spec: ModelSpec, llm_config: Optional[LLMConfig]) -> Dict[str, Any]:
        merged = dict(spec.params)
        if llm_config and llm_config.params:
            merged.update(llm_config.params)
        return merged

    @staticmethod
    def _build_payload(
        task: TaskDocument,
        generation: LLMGeneration,
        params: Mapping[str, Any],
    ) -> Dict[str, Any]:
        parsed: Any = None
        if task.output_schema:
            try:
                parsed = json.loads(generation.content)
            except json.JSONDecodeError as exc:  # pragma: no cover - defensive
                raise LLMInvocationError(f"failed to parse model output as JSON: {exc.msg}") from exc
            try:
                jsonschema.validate(parsed, task.output_schema)
            except jsonschema.ValidationError as exc:  # pragma: no cover - delegated to jsonschema
                raise LLMInvocationError(f"model output failed schema validation: {exc.message}") from exc
        payload = {
            "response": {
                "content": generation.content,
                "raw": generation.raw,
                "model": generation.model,
                "provider": generation.provider,
                "chunks": list(generation.chunks),
                "usage": dict(generation.usage) if generation.usage else {},
                "params": dict(params),
            },
            "parsed": parsed,
        }
        return payload

    @staticmethod
    def _evaluate_stop(
        stop: StopConfig,
        state_store: StateStore,
        inputs: Mapping[str, Any],
        payload: Mapping[str, Any],
        env: Mapping[str, Any],
    ) -> bool:
        if not stop.condition:
            return True
        evaluator = ConditionEvaluator(
            ConditionContext(
                state=state_store.to_dict(),
                inputs=inputs,
                result=payload,
                env=env,
            )
        )
        value = evaluator.evaluate(stop.condition)
        return bool(value)


__all__ = [
    "BaseLLMProvider",
    "LLMCallResult",
    "LLMGeneration",
    "LLMInvocationOptions",
    "LLMRuntime",
]
