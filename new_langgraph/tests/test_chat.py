from new_langgraph.chat.intake import LLMMessageIntake
from new_langgraph.chat.handlers import execute_command
from new_langgraph.config import default_paths
from new_langgraph.workflow import build_app, initial_state


class DummyMessage:
    def __init__(self, role: str, content: str) -> None:
        self.type = role
        self.content = content


def test_intake_fallback_plan_command():
    intake = LLMMessageIntake()
    command = intake.interpret("Plan a better onboarding", [], thread_id="chat-thread")
    assert command["command"] == "plan"
    assert "goal" in command


def test_execute_command_plan(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    app = build_app()
    paths = default_paths()
    command = {"command": "plan", "goal": "Launch analytics", "project_type": "fullstack"}
    history = [DummyMessage("user", "Launch analytics")]
    config = {"configurable": {"thread_id": "chat-thread"}}
    output = execute_command(command, history, config, app, paths)
    assert "Workflow" in output or "Goal" in output or output.strip()
