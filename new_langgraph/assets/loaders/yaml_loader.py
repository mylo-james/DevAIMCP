"""Load YAML-based BMAD assets."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from .._context import TEMPLATES_DIR, read_text


def load_yaml(name: str, directory: Path | None = None) -> dict[str, Any]:
    """Load a YAML asset from the configured templates directory."""
    directory = directory or TEMPLATES_DIR
    path = directory / name
    content = read_text(path)
    return yaml.safe_load(content)


__all__ = ["load_yaml"]
