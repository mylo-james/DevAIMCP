"""Tool adapter registry for YAML-defined workflows."""
from __future__ import annotations

from dataclasses import dataclass
import importlib
import json
from pathlib import Path
import shlex
import subprocess
from typing import Any, Callable, Dict, List, Mapping, Optional, Sequence
from urllib.parse import urlparse

import httpx
import jsonschema

from ..errors import YAMLRuntimeError
from ..state import StateStore
from ..schema.documents import ToolDocument, ToolType


@dataclass(slots=True)
class ToolContext:
    state: StateStore
    inputs: Mapping[str, Any]
    env: Mapping[str, Any]
    artifacts: Path


class BaseTool:
    def __init__(self, document: ToolDocument) -> None:
        self.document = document

    def invoke(self, payload: Mapping[str, Any], context: ToolContext) -> Any:
        raise NotImplementedError

    def validate_input(self, payload: Mapping[str, Any]) -> None:
        schema = self.document.input_schema
        if schema:
            try:
                jsonschema.validate(payload, schema)
            except jsonschema.ValidationError as exc:  # pragma: no cover - delegated to jsonschema
                raise YAMLRuntimeError(f"tool input schema validation failed: {exc.message}") from exc

    def validate_output(self, payload: Any) -> Any:
        schema = self.document.output_schema
        if schema:
            try:
                jsonschema.validate(payload, schema)
            except jsonschema.ValidationError as exc:  # pragma: no cover - delegated to jsonschema
                raise YAMLRuntimeError(f"tool output schema validation failed: {exc.message}") from exc
        return payload


class ShellTool(BaseTool):
    def __init__(self, document: ToolDocument) -> None:
        super().__init__(document)
        config = document.config
        self.allowed_commands: List[str] = [str(cmd) for cmd in config.get("allow", [])]
        self.default_cwd = config.get("cwd")
        if not self.allowed_commands:
            raise YAMLRuntimeError("shell tool requires non-empty 'allow' list of commands")

    def invoke(self, payload: Mapping[str, Any], context: ToolContext) -> Any:
        self.validate_input(payload)
        command = payload.get("command")
        if isinstance(command, str):
            args = shlex.split(command)
        elif isinstance(command, Sequence):
            args = [str(item) for item in command]
        else:
            raise YAMLRuntimeError("shell tool requires 'command' string or sequence")
        if not args:
            raise YAMLRuntimeError("shell tool received empty command")
        if self.allowed_commands and args[0] not in self.allowed_commands:
            raise YAMLRuntimeError(f"command '{args[0]}' not allowlisted")
        cwd = payload.get("cwd") or self.default_cwd
        if cwd:
            cwd_path = Path(cwd)
        else:
            cwd_path = Path.cwd()
        process = subprocess.run(
            args,
            cwd=str(cwd_path),
            capture_output=True,
            text=True,
            check=False,
        )
        result = {
            "returncode": process.returncode,
            "stdout": process.stdout,
            "stderr": process.stderr,
        }
        return self.validate_output(result)


class HttpTool(BaseTool):
    def __init__(self, document: ToolDocument) -> None:
        super().__init__(document)
        config = document.config
        self.base_url: Optional[str] = config.get("base_url")
        self.allowed_domains: List[str] = [str(domain) for domain in config.get("allow", [])]
        self.timeout = config.get("timeout", 10)
        self.default_method = config.get("method", "GET").upper()
        if not self.allowed_domains and not self.base_url:
            raise YAMLRuntimeError("http tool requires either 'base_url' or allowed domains")

    def invoke(self, payload: Mapping[str, Any], context: ToolContext) -> Any:
        self.validate_input(payload)
        url = str(payload.get("url") or self.base_url or "")
        if not url:
            raise YAMLRuntimeError("http tool requires a url")
        domain = urlparse(url).hostname
        if self.allowed_domains and domain not in self.allowed_domains:
            raise YAMLRuntimeError(f"domain '{domain}' not allowed")
        method = str(payload.get("method") or self.default_method).upper()
        with httpx.Client(timeout=self.timeout) as client:
            response = client.request(
                method,
                url,
                params=payload.get("params"),
                json=payload.get("json"),
                data=payload.get("data"),
                headers=payload.get("headers"),
            )
        result = {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "text": response.text,
        }
        if "json" in payload or response.headers.get("content-type", "").startswith("application/json"):
            try:
                result["json"] = response.json()
            except ValueError:
                pass
        return self.validate_output(result)


class FileTool(BaseTool):
    def __init__(self, document: ToolDocument) -> None:
        super().__init__(document)
        config = document.config
        root = config.get("root")
        if not isinstance(root, str) or not root.strip():
            raise YAMLRuntimeError("file tool requires 'root' directory in config")
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.readonly = config.get("mode") == "read"

    def _resolve_path(self, relative: str) -> Path:
        target = (self.root / relative).resolve()
        if self.root not in target.parents and target != self.root:
            raise YAMLRuntimeError("file path escapes sandbox root")
        return target

    def invoke(self, payload: Mapping[str, Any], context: ToolContext) -> Any:
        self.validate_input(payload)
        operation = payload.get("op") or payload.get("operation")
        path_value = payload.get("path")
        if not isinstance(path_value, str):
            raise YAMLRuntimeError("file tool requires string 'path'")
        path = self._resolve_path(path_value)
        if operation in {"read", "load"}:
            content = path.read_text(encoding="utf-8")
            return self.validate_output({"path": str(path), "content": content})
        if operation in {"write", "save"}:
            if self.readonly:
                raise YAMLRuntimeError("file tool configured as read-only")
            content = payload.get("content")
            if not isinstance(content, str):
                raise YAMLRuntimeError("file write requires string 'content'")
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            return self.validate_output({"path": str(path)})
        raise YAMLRuntimeError(f"unsupported file operation '{operation}'")


class SearchTool(BaseTool):
    def invoke(self, payload: Mapping[str, Any], context: ToolContext) -> Any:
        self.validate_input(payload)
        # Placeholder implementation. Integrations can swap in vendor-specific search clients.
        query = payload.get("query")
        return self.validate_output({"query": query, "results": []})


class PythonTool(BaseTool):
    def __init__(self, document: ToolDocument) -> None:
        super().__init__(document)
        entrypoint = document.python_entrypoint or document.config.get("callable")
        if not entrypoint:
            raise YAMLRuntimeError("python tool requires 'python_entrypoint' or config.callable")
        module_name, _, func_name = entrypoint.partition(":")
        if not func_name:
            raise YAMLRuntimeError("python entrypoint must be 'module:function'")
        module = importlib.import_module(module_name)
        func = getattr(module, func_name, None)
        if not callable(func):
            raise YAMLRuntimeError(f"callable '{entrypoint}' not found")
        self.callable: Callable[[Mapping[str, Any], ToolContext], Any]
        self.callable = func

    def invoke(self, payload: Mapping[str, Any], context: ToolContext) -> Any:
        self.validate_input(payload)
        result = self.callable(payload, context)
        return self.validate_output(result)


DEFAULT_TOOL_FACTORIES: Dict[ToolType, Callable[[ToolDocument], BaseTool]] = {
    ToolType.SHELL: ShellTool,
    ToolType.HTTP: HttpTool,
    ToolType.FILE: FileTool,
    ToolType.SEARCH: SearchTool,
    ToolType.PYTHON: PythonTool,
    ToolType.CODE: PythonTool,
    ToolType.CUSTOM: PythonTool,
}


class ToolRegistry:
    """Factory registry that instantiates tool adapters from documents."""

    def __init__(self, factories: Optional[Dict[ToolType, Callable[[ToolDocument], BaseTool]]] = None) -> None:
        self.factories = dict(DEFAULT_TOOL_FACTORIES)
        if factories:
            self.factories.update(factories)
        self._instances: Dict[str, BaseTool] = {}

    def create(self, document: ToolDocument) -> BaseTool:
        key = document.id
        if key in self._instances:
            return self._instances[key]
        factory = self.factories.get(document.type)
        if not factory:
            raise YAMLRuntimeError(f"no factory registered for tool type '{document.type.value}'")
        instance = factory(document)
        self._instances[key] = instance
        return instance

    def invoke(
        self,
        document: ToolDocument,
        payload: Mapping[str, Any],
        context: ToolContext,
    ) -> Any:
        tool = self.create(document)
        return tool.invoke(payload, context)


__all__ = [
    "BaseTool",
    "ToolContext",
    "ToolRegistry",
]
