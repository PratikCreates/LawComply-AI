from app.services.retrieval import combine_scores


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
