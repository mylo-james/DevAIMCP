from new_langgraph.storage import HybridKnowledgeStore


def test_hybrid_store_add_and_search():
    store = HybridKnowledgeStore()
    doc_id = store.add_document("Building a habit tracker with reminders", metadata={"topic": "habits"})
    assert doc_id
    results = list(store.search("habit", collection="documents", limit=3))
    assert results
    assert results[0].metadata["topic"] == "habits"


def test_hybrid_store_respects_zero_limit():
    store = HybridKnowledgeStore()
    store.add_document("Uniquequery content", metadata={"topic": "unique"})
    results = list(store.search("uniquequery", collection="documents", limit=0))
    assert results == []
