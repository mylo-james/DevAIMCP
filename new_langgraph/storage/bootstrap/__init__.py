"""Bootstrap helpers."""
from .ensure_tables import ensure_tables
from .seed_data import seed_default_documents

__all__ = ["ensure_tables", "seed_default_documents"]
