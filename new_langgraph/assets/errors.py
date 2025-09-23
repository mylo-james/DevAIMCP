"""Asset-related exception types."""
from __future__ import annotations


class AssetMissingError(FileNotFoundError):
    """Raised when a BMAD asset can not be found."""


__all__ = ["AssetMissingError"]
