from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from new_langgraph.cli.app import cli
from new_langgraph.yaml_runtime.errors import PolicyViolationError
from new_langgraph.yaml_runtime.run import RunOptions, run_workflow, validate_package


def example_package() -> Path:
    return Path(__file__).resolve().parent.parent / "examples" / "writing_assistant"


def llm_example_package() -> Path:
    return Path(__file__).resolve().parent.parent / "examples" / "llm_echo"


def policy_example_package() -> Path:
    return Path(__file__).resolve().parent.parent / "examples" / "policy_demo"


def test_validate_example_package():
    pkg = example_package()
    validate_package(pkg)


def test_run_example_workflow(tmp_path):
    pkg = example_package()
    result = run_workflow(
        pkg,
        "writing_flow",
        inputs={"topic": "Language Models"},
        artifacts_dir=tmp_path,
        options=RunOptions(artifacts_dir=tmp_path),
    )
    assert result.final_state["title"] == "Language Models"
    assert "Language Models" in result.final_state["draft"]
    outline_file = tmp_path / "outline.md"
    draft_file = tmp_path / "draft.md"
    assert outline_file.exists()
    assert draft_file.exists()


def test_cli_lg_run(tmp_path):
    runner = CliRunner()
    pkg = example_package()
    result = runner.invoke(
        cli,
        [
            "lg",
            "run",
            "--pkg",
            str(pkg),
            "--workflow",
            "writing_flow",
            "--input",
            json.dumps({"topic": "CLI Article"}),
            "--out",
            str(tmp_path),
        ],
    )
    assert result.exit_code == 0, result.output
    json_section = result.output.split("Artifacts", 1)[0]
    state = json.loads(json_section)
    assert state["title"] == "CLI Article"


def test_llm_workflow_with_fallback(tmp_path):
    pkg = llm_example_package()
    result = run_workflow(
        pkg,
        "qa_flow",
        inputs={"question": "What is LangGraph?"},
        artifacts_dir=tmp_path,
        options=RunOptions(artifacts_dir=tmp_path),
    )
    assert result.final_state["question"] == "What is LangGraph?"
    answer = result.final_state["answer"]
    assert answer.startswith("Override: ")
    trace_entry = result.trace[0]
    response = trace_entry.result["response"]
    assert response["provider"] == "echo"
    # Fallback model should have been selected after the primary failure.
    assert response["model_key"].endswith(":model:fallback")
    assert response["params"]["response_prefix"] == "Override: "
    parsed = trace_entry.result["parsed"]
    assert parsed["answer"] == answer


def test_policy_allows_file_tool(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    pkg = policy_example_package()
    result = run_workflow(
        pkg,
        "file_flow",
        inputs={"message": "Policy test"},
        artifacts_dir=tmp_path,
        options=RunOptions(artifacts_dir=tmp_path),
    )
    write_result = result.final_state["write_result"]
    assert isinstance(write_result, dict)
    path = Path(write_result["path"])
    assert path.exists()
    assert path.read_text(encoding="utf-8").strip() == "Policy test"


def test_policy_denies_shell_tool(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    pkg = policy_example_package()
    with pytest.raises(PolicyViolationError):
        run_workflow(
            pkg,
            "shell_flow",
            inputs={"message": "block"},
            artifacts_dir=tmp_path,
            options=RunOptions(artifacts_dir=tmp_path),
        )
