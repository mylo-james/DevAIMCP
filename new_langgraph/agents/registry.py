"""Agent factory and registry helpers."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, List, Optional

from .personas import Persona, get_persona

ResponseFormatter = Callable[[Persona, str, dict], str]


@dataclass(slots=True)
class Agent:
    """Lightweight agent description used for deterministic response generation."""

    name: str
    persona: Persona
    formatter: ResponseFormatter

    def respond(self, prompt: str, *, context: Optional[dict] = None) -> str:
        return self.formatter(self.persona, prompt, context or {})


class AgentRegistry:
    """Registry holding known agents and their formatters."""

    def __init__(self) -> None:
        self._agents: Dict[str, Agent] = {}

    def register(self, name: str, formatter: ResponseFormatter) -> Agent:
        persona = get_persona(name)
        agent = Agent(name=name, persona=persona, formatter=formatter)
        self._agents[name] = agent
        return agent

    def get(self, name: str) -> Agent:
        if name not in self._agents:
            self.register(name, default_formatter)
        return self._agents[name]

    def names(self) -> List[str]:
        return sorted(self._agents)


def default_formatter(persona: Persona, prompt: str, context: dict) -> str:
    """Produce a deterministic, persona-flavoured response for a prompt."""
    summary = prompt.strip().splitlines()[0] if prompt.strip() else "No prompt provided."
    bullets = "\n".join(f"- {line.strip()}" for line in prompt.splitlines() if line.strip())
    context_snippet = ""
    if context:
        context_lines = [f"{key}: {value}" for key, value in sorted(context.items())]
        context_snippet = "\n\nContext:\n" + "\n".join(context_lines)
    return (
        f"{persona.name} ({persona.tone}) summary:\n"
        f"{summary}\n\n"
        f"Key points:\n{bullets or '- (none)'}"
        f"{context_snippet}\n\n" + persona.signature
    )


_global_registry = AgentRegistry()


def generate_response(agent_name: str, prompt: str, **context) -> str:
    """Generate a response for the given agent using the registry."""
    agent = _global_registry.get(agent_name)
    return agent.respond(prompt, context=context)


__all__ = ["Agent", "AgentRegistry", "generate_response", "default_formatter"]
