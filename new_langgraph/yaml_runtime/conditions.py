"""JSONLogic-inspired condition evaluation for workflows."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping, Sequence


@dataclass(slots=True)
class ConditionContext:
    state: Mapping[str, Any]
    inputs: Mapping[str, Any]
    result: Mapping[str, Any] | None = None
    env: Mapping[str, Any] | None = None

    def lookup(self, path: str) -> Any:
        namespace, _, remainder = path.partition(".")
        if not remainder:
            remainder = namespace
            namespace = "state"
        source = {
            "state": self.state,
            "inputs": self.inputs,
            "result": self.result or {},
            "env": self.env or {},
        }.get(namespace)
        if source is None:
            return None
        return _dig(source, remainder)


class ConditionEvaluator:
    def __init__(self, context: ConditionContext) -> None:
        self.context = context

    def evaluate(self, expression: Any) -> bool:
        return bool(_evaluate(expression, self.context))

    def evaluate_value(self, expression: Any) -> Any:
        return _evaluate(expression, self.context)


def _evaluate(expression: Any, context: ConditionContext) -> Any:
    if isinstance(expression, (str, int, float, bool)) or expression is None:
        return expression
    if isinstance(expression, Sequence) and not isinstance(expression, (str, bytes, bytearray)):
        return [_evaluate(item, context) for item in expression]
    if not isinstance(expression, Mapping):
        return expression
    if len(expression) != 1:
        raise ValueError(f"invalid expression: {expression}")
    operator, operand = next(iter(expression.items()))
    if operator == "var":
        return _resolve_var(operand, context)
    if operator == "has":
        return _has(operand, context)
    if operator in {"!", "not"}:
        return not _truthy(_evaluate(operand, context))
    if operator in {"and", "all"}:
        return all(_truthy(_evaluate(arg, context)) for arg in _ensure_iterable(operand))
    if operator in {"or", "any"}:
        return any(_truthy(_evaluate(arg, context)) for arg in _ensure_iterable(operand))
    if operator in {"==", "equals"}:
        left, right = _binary_args(operand, context)
        return left == right
    if operator in {"!=", "distinct"}:
        left, right = _binary_args(operand, context)
        return left != right
    if operator in {">", "gt"}:
        left, right = _binary_args(operand, context)
        return left > right
    if operator in {"<", "lt"}:
        left, right = _binary_args(operand, context)
        return left < right
    if operator in {">=", "gte"}:
        left, right = _binary_args(operand, context)
        return left >= right
    if operator in {"<=", "lte"}:
        left, right = _binary_args(operand, context)
        return left <= right
    if operator == "contains":
        left, right = _binary_args(operand, context)
        if isinstance(right, Mapping):
            return _truthy(left in right)
        if isinstance(right, (str, bytes)):
            return str(left) in str(right)
        if isinstance(right, Iterable):
            return any(item == left for item in right)
        return False
    if operator in {"concat", "join"}:
        return "".join(str(_evaluate(item, context)) for item in _ensure_iterable(operand))
    if operator == "if":
        return _if_chain(operand, context)
    raise ValueError(f"unsupported operator '{operator}' in expression {expression}")


def _if_chain(operand: Any, context: ConditionContext) -> Any:
    values = list(_ensure_iterable(operand))
    pairs = len(values) // 2
    for index in range(0, pairs * 2, 2):
        condition = values[index]
        consequence = values[index + 1]
        if _truthy(_evaluate(condition, context)):
            return _evaluate(consequence, context)
    if len(values) % 2 == 1:
        return _evaluate(values[-1], context)
    return None


def _binary_args(operand: Any, context: ConditionContext) -> tuple[Any, Any]:
    items = list(_ensure_iterable(operand))
    if len(items) != 2:
        raise ValueError(f"binary operator expects 2 operands, received {items}")
    return _evaluate(items[0], context), _evaluate(items[1], context)


def _ensure_iterable(value: Any) -> Iterable[Any]:
    if isinstance(value, Mapping):
        return value.values()
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return value
    return [value]


def _resolve_var(operand: Any, context: ConditionContext) -> Any:
    if isinstance(operand, Mapping):
        path = operand.get("path") or operand.get("var")
        default = operand.get("default")
    else:
        path = operand
        default = None
    if not isinstance(path, str):
        return default
    value = context.lookup(path)
    return value if value is not None else default


def _has(operand: Any, context: ConditionContext) -> bool:
    if not isinstance(operand, (str, Mapping)):
        raise ValueError("has operator expects a string path")
    path = operand if isinstance(operand, str) else operand.get("path")
    if not isinstance(path, str):
        return False
    namespace, _, remainder = path.partition(".")
    if not remainder:
        remainder = namespace
        namespace = "state"
    source = {
        "state": context.state,
        "inputs": context.inputs,
        "result": context.result or {},
        "env": context.env or {},
    }.get(namespace)
    if source is None:
        return False
    value = _dig(source, remainder)
    return value is not None


def _truthy(value: Any) -> bool:
    return bool(value)


def _dig(source: Any, path: str) -> Any:
    parts = [part for part in path.split(".") if part]
    current = source
    for part in parts:
        if isinstance(current, Mapping):
            current = current.get(part)
        elif isinstance(current, Sequence) and part.isdigit():
            index = int(part)
            if index >= len(current):
                return None
            current = current[index]
        else:
            return None
    return current


__all__ = ["ConditionContext", "ConditionEvaluator"]
