#!/usr/bin/env python3
"""Generate baseline metrics for repository structure and documentation."""
from __future__ import annotations

import ast
import csv
import statistics
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_REPORT_DIR = REPO_ROOT / "reports"
PYTHON_SUFFIXES = {".py"}


@dataclass
class FileMetrics:
    path: Path
    line_count: int
    docstring_coverage: float
    definitions: int

    def to_row(self) -> List[str]:
        return [
            str(self.path.relative_to(REPO_ROOT)),
            str(self.line_count),
            f"{self.docstring_coverage:.2f}",
            str(self.definitions),
        ]


def iter_python_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*.py"):
        if path.is_file():
            yield path


def count_lines(path: Path) -> int:
    return sum(1 for _ in path.open("r", encoding="utf-8", errors="ignore"))


def docstring_coverage(path: Path) -> tuple[int, int]:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except SyntaxError:
        return 0, 0

    total_defs = 0
    documented = 0

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            total_defs += 1
            if ast.get_docstring(node):
                documented += 1

    return documented, total_defs


def build_metrics(paths: Iterable[Path]) -> List[FileMetrics]:
    metrics: List[FileMetrics] = []
    for path in paths:
        line_count = count_lines(path)
        documented, total_defs = docstring_coverage(path)
        coverage = documented / total_defs if total_defs else 1.0
        metrics.append(
            FileMetrics(
                path=path,
                line_count=line_count,
                docstring_coverage=coverage,
                definitions=total_defs,
            )
        )
    return metrics


def write_markdown_report(metrics: List[FileMetrics], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8") as handle:
        handle.write("# Repository Baseline Metrics\n\n")
        handle.write("| Path | Lines | Docstring Coverage | Definitions |\n")
        handle.write("| --- | ---: | ---: | ---: |\n")
        for item in sorted(metrics, key=lambda m: m.line_count, reverse=True):
            handle.write(
                f"| {item.path.relative_to(REPO_ROOT)} | {item.line_count} | "
                f"{item.docstring_coverage:.2f} | {item.definitions} |\n"
            )

        line_counts = [item.line_count for item in metrics]
        coverages = [item.docstring_coverage for item in metrics]

        if line_counts:
            handle.write("\n## Summary\n\n")
            handle.write(f"Total Python files: {len(metrics)}\n\n")
            handle.write(
                f"Mean line count: {statistics.mean(line_counts):.1f}\n\n"
                f"Median line count: {statistics.median(line_counts):.1f}\n\n"
                f"Mean docstring coverage: {statistics.mean(coverages):.2f}\n"
            )


def write_chunking_backlog(metrics: List[FileMetrics], destination: Path, *, max_lines: int = 300, max_defs: int = 10) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["path", "lines", "docstring_coverage", "definitions"])
        for item in sorted(metrics, key=lambda m: m.line_count, reverse=True):
            if item.line_count > max_lines or item.definitions > max_defs:
                writer.writerow(item.to_row())


def generate_reports(root: Path = REPO_ROOT, out_dir: Path = DEFAULT_REPORT_DIR) -> None:
    files = list(iter_python_files(root))
    metrics = build_metrics(files)

    write_markdown_report(metrics, out_dir / "baseline-metrics.md")
    write_chunking_backlog(metrics, out_dir / "chunking-backlog.csv")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate repository structural metrics.")
    parser.add_argument("--root", type=Path, default=REPO_ROOT, help="Repository root to scan.")
    parser.add_argument("--out", type=Path, default=DEFAULT_REPORT_DIR, help="Directory where reports will be written.")
    cli_args = parser.parse_args()

    generate_reports(root=cli_args.root, out_dir=cli_args.out)
