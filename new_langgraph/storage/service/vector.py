"""Vector search scaffolding using naive term-frequency vectors."""
from __future__ import annotations

import math
from collections import Counter
from typing import Dict


def _tf_vector(text: str) -> Dict[str, float]:
    tokens = [token for token in text.lower().split() if token]
    counts = Counter(tokens)
    total = float(len(tokens)) or 1.0
    return {token: frequency / total for token, frequency in counts.items()}


def cosine_similarity(a: Dict[str, float], b: Dict[str, float]) -> float:
    """Compute cosine similarity between two sparse vectors."""
    if not a or not b:
        return 0.0
    intersection = set(a).intersection(b)
    numerator = sum(a[token] * b[token] for token in intersection)
    if numerator == 0:
        return 0.0
    a_norm = math.sqrt(sum(value * value for value in a.values()))
    b_norm = math.sqrt(sum(value * value for value in b.values()))
    return numerator / (a_norm * b_norm) if a_norm and b_norm else 0.0


def vector_score(query: str, content: str) -> float:
    """Return cosine similarity between query and content TF vectors."""
    return cosine_similarity(_tf_vector(query), _tf_vector(content))


__all__ = ["vector_score", "cosine_similarity"]
