# FilingPulse — Runbook (Team A pipeline + live dashboard)

Real-time filing / IR change-detection pipeline. **Team A** owns ingestion (Bright Data),
normalization, SHA-256 fingerprinting, the Postgres `snapshots`/`alerts` store, the REST
endpoint Team B posts alerts into, and the live-feed frontend. **Team B** owns the AI core
(hash gate → materiality filter → Claude enrichment) and posts synthesized alerts back to us.

```
                 ┌──────────────────────── TEAM A (this repo) ────────────────────────┐
 Bright Data ──► scan ──► normalize ──► SHA-256 hash ──► snapshot (Postgres)
 SERP + Unlocker         (strip nav/        │                    │
                          ads/footer/        │  hash changed?     │
                          scripts)           ▼  yes → diff        ▼
                                       POST diff ───────────────► TEAM B  (/api/changes-receiver)
                                       (JSON contract)             hash → materiality → Claude
                                                                          │
 React live feed ◄── Socket.io 'alert' ◄── /api/alerts (DB + broadcast) ◄─┘  POST enriched alert
```

If Team B is offline, the pipeline falls back to a built-in local simulator (and a bundled
mock server) so the dashboard still demos end-to-end.

## Layout

| Path                 | What                                                              |
|----------------------|------------------------------------------------------------------|
| `team-a/`            | Team A NestJS backend (Bright Data, normalizer, pipeline, Prisma, Socket.io) |
| `frontend/`          | React + Vite live-feed dashboard                                 |
| `src/`               | Team B NestJS app (ingestion/detection/enrichment/delivery)      |
| `docker-compose.yml` | Postgres (`5432`) + Redis (`6379`)                               |
| `test-team-b-mock.js`| Standalone Team B mock on `:4000` for end-to-end demos           |

## Prerequisites
- Node 20+ and Docker Desktop.

## Run it (4 terminals)

```bash
# 0. Infra — Postgres + Redis
docker compose up -d

# 1. Team A backend (http://localhost:3000)
cd team-a
cp .env.example .env          # fill in Bright Data creds; DATABASE_URL already points at the compose Postgres
npm install
npx prisma migrate dev        # creates companies / snapshots / alerts tables
npx prisma db seed            # loads the demo watchlist (TSLA, BA, PLTR, ...)
npm run start:dev

# 2. Team B — the real AI-core app (now wired to Team A)
#    (from the repo root)
npm install
npm run start:dev             # listens on http://localhost:4000
#    Optional: set AIML_API_KEY to use real Claude; without it Team B uses a
#    deterministic local synthesizer so the pipeline still produces alerts.
#    Fallback for quick demos with zero deps:  node test-team-b-mock.js

# 3. Frontend (http://localhost:5173, or 5174 if busy)
cd frontend
cp .env.example .env          # optional; defaults to http://localhost:3000
npm install
npm run dev
```

Open http://localhost:5173 → **Watchlist** tab → **Scan Now** on any company. First scan stores a
baseline snapshot; later scans that detect a real content change emit a diff, which flows through
Team B and lands back in the **Live Feed** in real time.

## REST API (Team A, port 3000)

| Method | Route                     | Purpose                                                        |
|--------|---------------------------|----------------------------------------------------------------|
| GET    | `/api/companies`          | Watchlist + snapshot/alert counts                              |
| POST   | `/api/companies`          | Add company; auto-discovers IR/filings URLs via Bright Data SERP |
| POST   | `/api/companies/:id/scan` | Run the scrape → normalize → hash → snapshot → diff pipeline    |
| POST   | `/api/companies/:id/simulate-change` | Demo: inject a material change through the full real pipeline |
| GET    | `/api/alerts?limit=N`     | Recent alerts                                                  |
| POST   | `/api/alerts`             | **Team B posts enriched alerts here** → saved + broadcast over Socket.io |

Socket.io: clients connect to `http://localhost:3000` and listen for the `alert` event.

## JSON contract

**A → B** (Team A POSTs the detected change to `TEAM_B_WEBHOOK_URL`):
```json
{
  "companyId": "uuid", "companyName": "Tesla", "ticker": "TSLA",
  "sourceUrl": "https://ir.tesla.com", "scannedAt": "ISO-8601",
  "previousHash": "sha256", "currentHash": "sha256",
  "previousNormalizedText": "...", "currentNormalizedText": "...",
  "diff": "- old line\n+ new line"
}
```

**B → A** (Team B POSTs the synthesized alert to `POST /api/alerts`):
```json
{
  "companyId": "uuid",        // echo back the companyId from the diff payload
  "title": "...", "summary": "...",
  "whatChanged": "...", "whyItMatters": "...",
  "confidence": 0.94,         // 0.0–1.0
  "severity": "HIGH",         // INFO | LOW | MEDIUM | HIGH | CRITICAL
  "sourceLink": "https://ir.tesla.com"
}
```

## Team B wiring (done)
The real Team B app (`src/`) is now connected to Team A:
- `src/main.ts` — listens on **4000** + CORS.
- `src/ingestion/*` — `POST /ingest` accepts the **A → B** contract; runs the gates in order
  **hash → materiality → enrichment** (the two cheap gates before the expensive LLM call).
- `src/enrichment/enrichment.service.ts` — calls Claude via AIML when `AIML_API_KEY` is set,
  otherwise uses a deterministic keyword synthesizer (same JSON shape) so the demo never stalls.
- `src/delivery/delivery.service.ts` — maps the enriched alert to the **B → A** contract and
  POSTs it to `TEAM_A_ALERT_URL` (default `http://localhost:3000/api/alerts`).
- `team-a/.env` — `TEAM_B_WEBHOOK_URL=http://localhost:4000/ingest`.

> These are Team-B-side edits made to connect the pipeline — flag them to @ilyaskhan6410 / @DjPapzin.

## Verified (2026-05-29)
- `docker compose up` → Postgres + Redis healthy.
- `prisma migrate dev` → `companies` / `snapshots` / `alerts` created.
- Real Bright Data scan of `ir.tesla.com` + SEC EDGAR → normalized, SHA-256 hashed, baseline
  snapshots persisted; re-scan of identical content → `NO_CHANGE` (transient-content scrubbing
  prevents false positives).
- Full **real** contract loop: `simulate-change` → Team A diff → Team B `/ingest`
  (hash → materiality → enrichment) → `POST /api/alerts` → persisted (PLTR, HIGH, 0.94) →
  `alert` delivered over Socket.io to the dashboard.
- `team-a`, root Team B, and `frontend` all build clean.
