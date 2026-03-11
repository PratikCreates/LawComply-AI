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


def test_history_and_analytics_endpoints_return_data() -> None:
    client.post("/api/v1/analyze", json={"policy_id": "acme_data_retention_policy.md"})
    history = client.get("/api/v1/history")
    summary = client.get("/api/v1/analytics/summary")
    coverage = client.get("/api/v1/analytics/coverage-matrix")
    csv_export = client.get("/api/v1/history/export.csv")

    assert history.status_code == 200
    assert len(history.json()["items"]) >= 1
    assert summary.status_code == 200
    assert summary.json()["total_runs"] >= 1
    assert coverage.status_code == 200
    assert "rows" in coverage.json()
    assert csv_export.status_code == 200
    assert "run_id,created_at,policy_name" in csv_export.text
