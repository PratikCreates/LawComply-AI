# LawComply AI

LawComply AI is an end-to-end agentic RAG framework for regulatory compliance analysis. It ingests internal policy documents, indexes regulatory clauses into a vector database, retrieves evidence with citation locking, and produces auditable gap analyses through a FastAPI backend and a React frontend.

## Stack

- Python 3.11
- FastAPI
- LangChain
- Chroma vector database
- Nebius-hosted LLM and embedding endpoints through the OpenAI-compatible API
- React, TypeScript, Vite

## Core capabilities

- Regulation ingestion with deterministic clause identifiers
- Citation-locked compliance analysis with hallucination mitigation
- Retrieval-backed gap detection and remediation guidance
- Sample corpora covering privacy and finance controls
- Professional review dashboard for analysts and hiring demos

## Repository layout

- `backend/`: FastAPI service, retrieval pipeline, tests, and scripts
- `frontend/`: React dashboard
- `data/`: sample policies, regulations, and benchmark fixtures
- `docs/`: architecture and operating notes

## Quick start

1. Copy `.env.example` to `.env` and add your Nebius key.
2. Create a Python virtual environment and install backend dependencies.
3. Install frontend dependencies.
4. Build the vector index.
5. Start the API and the web client.

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .[dev]
python scripts\rebuild_index.py
uvicorn app.main:app --reload --port 8000
```

### Benchmark

```powershell
cd backend
.\.venv\Scripts\python scripts\run_baseline_benchmark.py
```

This writes `backend/baseline_benchmark_report.json` with citation coverage results for the seeded scenarios.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## API overview

- `GET /health`
- `GET /api/v1/library/stats`
- `GET /api/v1/policies`
- `POST /api/v1/index/rebuild`
- `POST /api/v1/analyze`

## Hallucination controls

- The LLM only sees retrieved evidence packs with explicit clause IDs.
- Citation IDs are validated against the retrieval set before results are returned.
- Unsupported citations trigger a hard validation failure instead of a silent answer.
- The analysis prompt forbids uncited legal claims and requires remediation proposals tied to evidence.

## Example resume framing

- Built an agentic RAG compliance system that indexes legal clauses, enforces immutable citation validation, and produces auditable gap reports across privacy and finance policy domains.
- Implemented retrieval-backed compliance scoring with FastAPI, LangChain, Chroma, Nebius-hosted models, and a production-style React review dashboard.

## Documentation

- [Architecture](C:\Users\prati\Downloads\Projects\LawComply-AI\docs\architecture.md)
