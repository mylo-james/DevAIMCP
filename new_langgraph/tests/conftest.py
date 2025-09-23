"""Test fixtures and path bootstrapping for the new LangGraph package."""
import sys
from pathlib import Path


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
"""Filesystem directory that contains the ``new_langgraph`` package."""

REPO_ROOT = PACKAGE_ROOT.parent
"""Repository root; needed on sys.path so ``import new_langgraph`` succeeds."""

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
