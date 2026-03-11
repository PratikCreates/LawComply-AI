from app.services.repository import DocumentRepository


def test_policy_repository_has_seed_data() -> None:
    records = DocumentRepository().list_policies()
    assert len(records) >= 2
    assert any("ACME Data Retention" in record.title for record in records)
