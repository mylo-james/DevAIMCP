from new_langgraph.nodes.planning.shared.load_task import doc_id_from_state


def test_doc_id_from_state_is_deterministic():
    state = {"goal": "Ship analytics dashboard", "project_slug": "analytics-dashboard"}
    first = doc_id_from_state(state, "brief")
    second = doc_id_from_state(dict(state), "brief")
    assert first == second


def test_doc_id_from_state_changes_with_inputs():
    state = {"goal": "Ship analytics dashboard", "project_slug": "analytics-dashboard"}
    brief_id = doc_id_from_state(state, "brief")
    prd_id = doc_id_from_state(state, "prd")
    assert brief_id != prd_id
