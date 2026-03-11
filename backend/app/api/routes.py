from functools import lru_cache

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from app.models.schemas import (
    AnalyticsSummaryResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    CoverageMatrixResponse,
    LibraryStats,
    PolicyRecord,
    PortfolioScanRequest,
    PortfolioScanResponse,
    RunHistoryResponse,
)
from app.services.analysis import ComplianceAnalysisService


router = APIRouter(prefix="/api/v1")


@lru_cache
def get_service() -> ComplianceAnalysisService:
    return ComplianceAnalysisService()


@router.get("/policies", response_model=list[PolicyRecord])
def list_policies() -> list[PolicyRecord]:
    return get_service().list_policies()


@router.get("/library/stats", response_model=LibraryStats)
def library_stats() -> LibraryStats:
    return LibraryStats.model_validate(get_service().get_stats())


@router.get("/history", response_model=RunHistoryResponse)
def history() -> RunHistoryResponse:
    return get_service().history()


@router.get("/analytics/summary", response_model=AnalyticsSummaryResponse)
def analytics_summary() -> AnalyticsSummaryResponse:
    return get_service().analytics_summary()


@router.get("/analytics/coverage-matrix", response_model=CoverageMatrixResponse)
def coverage_matrix() -> CoverageMatrixResponse:
    return get_service().coverage_matrix()


@router.get("/history/export.csv", response_class=PlainTextResponse)
def history_csv() -> str:
    return get_service().history_csv()


@router.post("/index/rebuild")
def rebuild_index() -> dict[str, int]:
    clauses = get_service().rebuild_index()
    return {"indexed_clauses": clauses}


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    try:
        return get_service().analyze(request)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/portfolio/scan", response_model=PortfolioScanResponse)
def portfolio_scan(request: PortfolioScanRequest) -> PortfolioScanResponse:
    try:
        return get_service().portfolio_scan(request)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
