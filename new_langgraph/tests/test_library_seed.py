from new_langgraph.config import DEFAULT_COLLECTION
from new_langgraph.storage import get_knowledge_store


def test_library_seed_populates_store():
    store = get_knowledge_store()
    results = list(store.search("Product Manager", collection=DEFAULT_COLLECTION, limit=5))
    assert results, "expected BMAD library documents to be searchable"
    assert all(".bmad-core" not in result.metadata.get("path", "") for result in results)
