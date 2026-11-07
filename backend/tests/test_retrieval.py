from app.services.retrieval import combine_scores
from app.services.retrieval import RetrievalService
from app.services.vector_store import LocalHashEmbeddings


def test_hybrid_strategy_rewards_matching_domain() -> None:
    matching_domain = combine_scores(
        semantic_score=0.42,
        lexical_score=0.08,
        query_domain="finance",
        candidate_domain="finance",
        strategy="hybrid",
    )
    mismatched_domain = combine_scores(
        semantic_score=0.42,
        lexical_score=0.08,
        query_domain="finance",
        candidate_domain="privacy",
        strategy="hybrid",
    )
    assert matching_domain > mismatched_domain


def test_local_hash_embeddings_are_deterministic_and_normalized() -> None:
    embeddings = LocalHashEmbeddings()

    first = embeddings.embed_query("retention schedule and deletion requests")
    second = embeddings.embed_query("retention schedule and deletion requests")

    assert first == second
    assert len(first) == embeddings.dimensions
    assert round(sum(value * value for value in first), 6) == 1.0


def test_retrieval_falls_back_to_lexical_score_on_embedding_dimension_mismatch() -> None:
    class StubIndex:
        embeddings = LocalHashEmbeddings()

        def fetch_all(self) -> list[dict]:
            return [
                {
                    "id": "bad-vector",
                    "embedding": [0.1, 0.2],
                    "document": "Controllers must publish retention periods and deletion instructions.",
                    "metadata": {
                        "clause_id": "GDPR-ART-13",
                        "source_document": "gdpr_simulated.md",
                    },
                },
                {
                    "id": "finance-vector",
                    "embedding": self.embeddings.embed_query("tax filing and journal reconciliation"),
                    "document": "Finance teams reconcile journals before statutory filing.",
                    "metadata": {
                        "clause_id": "FIN-CTRL-01",
                        "source_document": "finance_controls.md",
                    },
                },
            ]

    evidence = RetrievalService(StubIndex()).retrieve_evidence(
        "data retention deletion policy",
        top_k=1,
    )

    assert evidence[0].clause_id == "GDPR-ART-13"
    assert evidence[0].score > 0
