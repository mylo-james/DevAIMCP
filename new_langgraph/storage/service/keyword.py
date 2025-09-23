"""Keyword search scoring helpers."""
from __future__ import annotations

import math
from collections import Counter


def keyword_score(query: str, content: str) -> float:
    """Return a simple keyword-overlap score between query and content."""
    if not query or not content:
        return 0.0
    query_terms = Counter(token for token in query.lower().split())
    content_terms = Counter(token for token in content.lower().split())
    matches = sum(min(count, content_terms.get(token, 0)) for token, count in query_terms.items())
    if matches == 0:
        return 0.0
    norm = math.sqrt(sum(query_terms.values())) * math.sqrt(sum(content_terms.values()))
    return matches / norm if norm else float(matches)


__all__ = ["keyword_score"]
