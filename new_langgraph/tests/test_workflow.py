import json
from pathlib import Path

from new_langgraph.config import BASE_DIR
from new_langgraph.workflow import build_app, initial_state


def test_planning_run_creates_artifacts(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    app = build_app()
    state = initial_state("Launch a habit tracker", "fullstack", thread_id="test-thread")
    result = app.invoke(state, config={"configurable": {"thread_id": "test-thread"}})

    assert result["brief"].strip()
    assert result["prd"].strip()
    assert result["architecture"].strip()
    assert result["story_queue"], "Story queue should be populated"

    snapshot = app.get_state(config={"configurable": {"thread_id": "test-thread"}})
    assert snapshot and snapshot.values["story_queue"]

    brief_path = BASE_DIR / "docs" / "brief.md"
    assert brief_path.exists()
    log_file = BASE_DIR / "logs" / "test-thread.jsonl"
    if log_file.exists():
        payloads = [json.loads(line) for line in log_file.read_text().splitlines() if line]
        assert payloads, "Log file should contain state snapshots"


def test_resume_command_uses_command_resume(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    app = build_app()
    thread_id = "resume-thread"
    state = initial_state("Recover from outage", "fullstack", thread_id=thread_id)
    app.invoke(state, config={"configurable": {"thread_id": thread_id}})

    from langgraph.types import Command

    resume_payload = {"approve": True}
    result = app.invoke(Command(resume=resume_payload), config={"configurable": {"thread_id": thread_id}})
    assert result.get("resume_payloads")
    assert resume_payload in result["resume_payloads"]

    snapshot = app.get_state(config={"configurable": {"thread_id": thread_id}})
    assert snapshot and resume_payload in snapshot.values.get("resume_payloads", [])


def test_resume_command_handles_object_without_kwargs(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    app = build_app()
    thread_id = "resume-object-thread"
    state = initial_state("Handle resume", "fullstack", thread_id=thread_id)
    app.invoke(state, config={"configurable": {"thread_id": thread_id}})

    class PlainResume:
        def __init__(self, payload):
            self.resume = payload

    resume_payload = {"ready": True}
    result = app.invoke(PlainResume(resume_payload), config={"configurable": {"thread_id": thread_id}})
    assert resume_payload in result.get("resume_payloads", [])

    snapshot = app.get_state(config={"configurable": {"thread_id": thread_id}})
    assert snapshot and resume_payload in snapshot.values.get("resume_payloads", [])


def test_dev_plan_path_persisted_for_qa(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    app = build_app()
    thread_id = "dev-plan-thread"
    state = initial_state("Build analytics", "fullstack", thread_id=thread_id)
    app.invoke(state, config={"configurable": {"thread_id": thread_id}})

    app.invoke({}, config={"configurable": {"thread_id": thread_id}})
    snapshot = app.get_state(config={"configurable": {"thread_id": thread_id}})
    assert snapshot
    story_outputs = snapshot.values.get("story_outputs")
    assert isinstance(story_outputs, dict) and story_outputs
    first_story = next(iter(story_outputs.values()))
    assert first_story.get("dev_plan_path")
    assert first_story["dev_plan_path"].endswith("-dev-plan.md")


def test_dev_plan_story_handles_missing_filepath(tmp_path):
    from new_langgraph.nodes.stories.dev_plan_story import dev_plan_story

    docs_root = tmp_path / "docs"
    path_config = {
        "docs_root": docs_root,
        "prd": docs_root / "prd.md",
        "architecture": docs_root / "architecture.md",
        "stories_root": docs_root / "stories",
        "epics_root": docs_root / "epics",
        "qa_root": docs_root / "qa",
        "qa_assessments": docs_root / "qa" / "assessments",
        "qa_gates": docs_root / "qa" / "gates",
        "logs_root": tmp_path / "logs",
    }

    state = {
        "current_story": {
            "id": "story-1",
            "title": "Implement fallback handling",
            "status": "draft",
            "filepath": "",
        },
        "story_outputs": {},
        "project_slug": "fallback-handling",
        "thread_id": "thread",
    }

    result = dev_plan_story(state, paths=path_config, knowledge_store=None)
    current_story = result["current_story"]
    dev_plan_path = current_story["dev_plan_path"]
    assert dev_plan_path.endswith("story-1-dev-plan.md")
    assert (docs_root / "stories").exists()
    assert (path_config["stories_root"] / "story-1-dev-plan.md").exists()
    assert current_story.get("filepath")
    assert result["story_outputs"]["story-1"]["dev_plan_path"] == dev_plan_path


def test_app_maintains_separate_thread_state(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    app = build_app()

    first_goal = "Build thread isolation"
    thread_a = "thread-a"
    state_a = initial_state(first_goal, "fullstack", thread_id=thread_a)
    app.invoke(state_a, config={"configurable": {"thread_id": thread_a}})

    second_goal = "Build another workflow"
    thread_b = "thread-b"
    state_b = initial_state(second_goal, "fullstack", thread_id=thread_b)
    app.invoke(state_b, config={"configurable": {"thread_id": thread_b}})

    snapshot_a = app.get_state(config={"configurable": {"thread_id": thread_a}})
    snapshot_b = app.get_state(config={"configurable": {"thread_id": thread_b}})

    assert snapshot_a is not None and snapshot_b is not None
    assert snapshot_a.values["goal"] == first_goal
    assert snapshot_b.values["goal"] == second_goal
