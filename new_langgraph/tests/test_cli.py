import os
from pathlib import Path

from typer.testing import CliRunner

from new_langgraph.cli.app import cli
from new_langgraph.config import BASE_DIR


runner = CliRunner()


def test_plan_command_generates_brief(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    result = runner.invoke(cli, ["plan", "Launch an email digest"])
    assert result.exit_code == 0, result.output
    brief_path = BASE_DIR / "docs" / "brief.md"
    assert brief_path.exists()
    content = brief_path.read_text().strip()
    assert "Launch" in content


def test_resume_command_rejects_invalid_json(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    result = runner.invoke(cli, ["resume", "--data", "{invalid}"])
    assert result.exit_code == 1
    assert "Invalid JSON payload" in result.output


def test_load_app_restores_checkpointer_env(monkeypatch, tmp_path):
    from new_langgraph.cli.runtime import invoke as runtime_invoke

    captured = {}

    def fake_build_app(*, paths, db_path):
        captured["paths"] = paths
        captured["db_path"] = db_path
        class DummyApp:
            pass

        return DummyApp()

    monkeypatch.setattr(runtime_invoke, "build_app", fake_build_app)
    monkeypatch.setattr(runtime_invoke, "default_paths", lambda: {"docs_root": tmp_path / "docs"})

    monkeypatch.setenv("BMAD_CHECKPOINTER", "sqlite-original")
    runtime_invoke.load_app("bmad.db", checkpointer="postgres")
    assert os.environ.get("BMAD_CHECKPOINTER") == "sqlite-original"

    monkeypatch.delenv("BMAD_CHECKPOINTER", raising=False)
    runtime_invoke.load_app("bmad.db", checkpointer="sqlite")
    assert "BMAD_CHECKPOINTER" not in os.environ


def test_status_command_reports_latest_state(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    plan_goal = "Launch status insights"
    plan_result = runner.invoke(cli, ["plan", plan_goal])
    assert plan_result.exit_code == 0, plan_result.output

    status_result = runner.invoke(cli, ["status"])
    assert status_result.exit_code == 0, status_result.output
    assert plan_goal in status_result.output
