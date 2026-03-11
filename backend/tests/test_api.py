from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_head_is_supported() -> None:
    response = client.head("/health")
    assert response.status_code == 200


def test_analyze_response_includes_metrics_and_report() -> None:
    response = client.post("/api/v1/analyze", json={"policy_id": "acme_finance_operations_policy.md"})
    payload = response.json()
    assert response.status_code == 200
    assert "metrics" in payload
    assert payload["metrics"]["finding_count"] >= 1
    assert "report_markdown" in payload
    assert "Compliance Report" in payload["report_markdown"]


def test_portfolio_scan_returns_seeded_summaries() -> None:
    response = client.post("/api/v1/portfolio/scan", json={})
    payload = response.json()
    assert response.status_code == 200
    assert payload["scanned_policies"] >= 2
    assert len(payload["summaries"]) >= 2
