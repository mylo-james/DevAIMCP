"""Prompt template rendering helpers built on top of Jinja2."""
from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional

from jinja2 import Environment, StrictUndefined
import yaml

from .schema.documents import InlineTemplate, TemplateDocument


def _yaml_filter(value: Any) -> str:
    return yaml.safe_dump(value, sort_keys=False).strip()


def _json_filter(value: Any) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False)


def _md_table(rows: Iterable[Mapping[str, Any]]) -> str:
    rows = list(rows)
    if not rows:
        return ""
    headers = list(rows[0].keys())
    lines = ["| " + " | ".join(headers) + " |"]
    lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
    for row in rows:
        lines.append("| " + " | ".join(str(row.get(h, "")) for h in headers) + " |")
    return "\n".join(lines)


def _dedent(value: str) -> str:
    import textwrap

    return textwrap.dedent(value)


def _wrap(value: str, width: int = 80) -> str:
    import textwrap

    return textwrap.fill(value, width=width)


def build_environment() -> Environment:
    env = Environment(
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
        undefined=StrictUndefined,
    )
    env.filters.update(
        {
            "yaml": _yaml_filter,
            "json": _json_filter,
            "md_table": _md_table,
            "dedent": _dedent,
            "wrap": _wrap,
        }
    )
    return env


@dataclass(slots=True)
class RenderedPrompt:
    messages: List[Dict[str, str]]


def _materialize_template(
    template: TemplateDocument | InlineTemplate,
    registry_lookup: Optional[Callable[[str], Optional[InlineTemplate]]],
) -> InlineTemplate:
    if isinstance(template, InlineTemplate):
        return template
    if template.extends and registry_lookup:
        parent = registry_lookup(template.extends)
        if parent:
            merged = InlineTemplate(
                format=template.format,
                system=template.system or parent.system,
                user=template.user or parent.user,
                messages=template.messages or parent.messages,
                vars=template.vars or parent.vars,
                extends=None,
            )
            return merged
    return InlineTemplate(
        format=template.format,
        system=template.system,
        user=template.user,
        messages=template.messages,
        vars=template.vars,
        extends=None,
    )


class TemplateEngine:
    """Manages template lookup and rendering."""

    def __init__(self, templates: Mapping[str, TemplateDocument]) -> None:
        self.templates = templates
        self.environment = build_environment()

    def get(self, template_ref: str) -> TemplateDocument:
        document = self.templates.get(template_ref)
        if not document:
            raise KeyError(f"template '{template_ref}' not found")
        return document

    def render(
        self,
        template: TemplateDocument | InlineTemplate,
        context: Mapping[str, Any],
    ) -> RenderedPrompt:
        inline = _materialize_template(template, self._lookup_inline)
        messages: List[Dict[str, str]] = []
        if inline.system:
            messages.append({"role": "system", "content": self._render_string(inline.system, context)})
        if inline.user:
            messages.append({"role": "user", "content": self._render_string(inline.user, context)})
        for message in inline.messages:
            messages.append(
                {
                    "role": message.role,
                    "content": self._render_string(message.content, context),
                }
            )
        return RenderedPrompt(messages=messages)

    def render_by_ref(self, template_ref: str, context: Mapping[str, Any]) -> RenderedPrompt:
        document = self.get(template_ref)
        return self.render(document, context)

    def _render_string(self, source: str, context: Mapping[str, Any]) -> str:
        template = self.environment.from_string(source)
        return template.render(**context)

    def _lookup_inline(self, template_ref: str) -> Optional[InlineTemplate]:
        doc = self.templates.get(template_ref)
        if not doc:
            return None
        return _materialize_template(doc, self._lookup_inline)


__all__ = ["RenderedPrompt", "TemplateEngine", "build_environment"]
