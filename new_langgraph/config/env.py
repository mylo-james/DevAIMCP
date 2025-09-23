"""Environment variable accessors."""
from __future__ import annotations

import os


def get_env(key: str, default: str | None = None) -> str | None:
    """Return the environment variable value or the provided default."""
    value = os.getenv(key)
    return value if value is not None else default


__all__ = ["get_env"]
