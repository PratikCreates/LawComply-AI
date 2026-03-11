from functools import lru_cache

from fastapi import APIRouter, HTTPException

from app.models.schemas import AnalyzeRequest, AnalyzeResponse, LibraryStats, PolicyRecord
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
