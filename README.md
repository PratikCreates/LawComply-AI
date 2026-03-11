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
- Hybrid retrieval with domain-aware reranking to reduce cross-domain evidence pollution
- Portfolio scan across multiple policies with ranked risk summaries
- Markdown compliance report export for review sharing and documentation
- Direct text or file-based policy intake for faster analyst workflows
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

### Retrieval evaluation

```powershell
cd backend
.\.venv\Scripts\python scripts\run_retrieval_benchmark.py
```

On the seeded 12-case retrieval set used in this repository, the hybrid reranker preserved `Recall@5 = 1.00` and `MRR = 1.00` while improving in-domain precision from `0.8333` to `1.0000`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## What makes it useful

- You can review seeded policies immediately without preparing any extra data.
- You can paste a real policy excerpt or load a `.txt` or `.md` file from the web app.
- Every run returns a structured report, evidence-backed findings, derived risk metrics, and a markdown export that can be shared with a reviewer.
- The portfolio scan highlights which policy should be reviewed first instead of forcing users to inspect documents one by one.

## API overview

- `GET /health`
- `GET /api/v1/library/stats`
- `GET /api/v1/policies`
- `POST /api/v1/index/rebuild`
- `POST /api/v1/analyze`
- `POST /api/v1/portfolio/scan`

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
