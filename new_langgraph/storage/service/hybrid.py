"""Hybrid scoring helpers that blend keyword and vector signals."""
from __future__ import annotations

from .keyword import keyword_score
from .vector import vector_score


def hybrid_score(query: str, content: str, *, keyword_weight: float = 0.4) -> float:
    """Blend keyword and vector scores with a configurable weight."""
    keyword = keyword_score(query, content)
    vector = vector_score(query, content)
    weight = max(0.0, min(1.0, keyword_weight))
    return weight * keyword + (1.0 - weight) * vector


__all__ = ["hybrid_score"]
