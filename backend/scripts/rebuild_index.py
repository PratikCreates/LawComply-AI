from app.services.analysis import ComplianceAnalysisService


if __name__ == "__main__":
    service = ComplianceAnalysisService()
    total = service.rebuild_index()
    print(f"Indexed {total} regulation clauses.")

