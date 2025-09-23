#!/usr/bin/env python3
"""Fail if any Python module exceeds the configured chunk size budget."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MAX_LINES = 300


def iter_python_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*.py"):
        if path.is_file():
            yield path


def check_file(path: Path, *, max_lines: int) -> tuple[bool, int]:
    line_count = sum(1 for _ in path.open("r", encoding="utf-8", errors="ignore"))
    return line_count <= max_lines, line_count


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Python file chunk sizes.")
    parser.add_argument("--root", type=Path, default=REPO_ROOT, help="Repository root to scan.")
    parser.add_argument("--max-lines", type=int, default=DEFAULT_MAX_LINES, help="Maximum allowed lines per file.")
    args = parser.parse_args()

    failures: list[str] = []
    for file_path in iter_python_files(args.root):
        ok, line_count = check_file(file_path, max_lines=args.max_lines)
        if not ok:
            rel = file_path.relative_to(args.root)
            failures.append(f"{rel} has {line_count} lines (limit {args.max_lines}).")

    if failures:
        print("Chunk size check failed:", file=sys.stderr)
        for line in failures:
            print(f"  - {line}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
