"""Derive sandbox allowed-path fingerprints."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Iterable, Tuple


def allowed_paths_key(paths: Iterable[Path]) -> Tuple[str, ...]:
    """Return a fingerprint tuple that encodes allowed paths."""
    resolved = sorted(str(Path(path).resolve()) for path in paths)
    if not resolved:
        return tuple()
    fingerprint = hashlib.sha256(json.dumps(resolved, sort_keys=True).encode()).hexdigest()[:16]
    return tuple([fingerprint, *resolved])


__all__ = ["allowed_paths_key"]
