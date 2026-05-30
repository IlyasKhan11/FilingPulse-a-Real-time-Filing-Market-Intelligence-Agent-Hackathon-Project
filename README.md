# FilingPulse — Know the Moment It Matters

Real-time filing intelligence for compliance teams, small funds, and analysts 
who can't afford to find out late.

## What it does

FilingPulse monitors company filings and investor-relations pages continuously. 
When something material changes — a new 8-K, a revised risk factor, a quiet IR 
page edit — it detects the change, filters out cosmetic noise, and pushes a 
structured AI-generated alert in real time.

Each alert contains:
- **What changed** — plain English description
- **Why it matters** — compliance and investor relevance  
- **Confidence score** — 0.0 to 1.0
- **Severity** — low / medium / high
- **Source link** — verified URL

## How it works

Bright Data (SERP API + Web Unlocker)
↓
Normalize + SHA-256 hash
↓
Gate 1: Hash check — identical = discard
↓
Gate 2: Materiality filter — cosmetic = discard
↓
Gate 3: Claude AI enrichment — structured JSON alert
↓
Socket.io — live feed to frontend


Two cheap gates run before the expensive AI call. On ~95% of fetches, 
the LLM never fires.

## Demo watchlist

| Company | Ticker | Why compliance cares |
|---|---|---|
| Super Micro Computer | SMCI | Filing delays, delisting risk |
| MicroStrategy | MSTR | Bitcoin purchase 8-Ks, crypto leverage |
| Unilever | UL | IR page edits outside EDGAR |
| Boeing | BA | FAA + DOJ + SEC multi-regulator |
| Carvana | CVNA | Going concern, covenant risk |
| Tesla | TSLA | CEO disclosure, governance |
| Palantir | PLTR | Government contract concentration |
| JPMorgan Chase | JPM | Stress tests, capital requirements |

## Live demo

Backend: https://filingpulse-backend-production.up.railway.app

Scan a company:GET /scan?url=https://ir.microstrategy.com/news-releases


## Tech stack

- **NestJS** — backend orchestration
- **Bright Data** — Web Unlocker + SERP API (ingestion)
- **Claude via AI/ML API** — AI enrichment
- **Redis + BullMQ** — job queue and rate limiting
- **Postgres / NeonDB** — storage
- **Socket.io** — live feed delivery
- **React + Vite** — frontend dashboard

## Running locally

```bash
# Backend
cd filingpulse-backend
npm install
cp .envexample .env
# Add your keys to .env
npm run start

# Frontend
cd frontend
npm install
npm run dev
```

## Environment variables
AIML_API_KEY=your_aiml_api_key
BRIGHTDATA_WEB_UNLOCKER_PROXY=your_proxy_string
DATABASE_URL=your_postgres_url


## Team

| Name | Role |
|---|---|
| Muhammad Ilyas Khan | Engineering + Product |
| Lucy Michaels | Product + Finance |
| Abdul Moiz Sheraz | Data + AI |
| Robynn Robyn | Data + AI |
| Letlhogonolo Fanampe | Engineering |

---

Built at the Bright Data AI Agents Hackathon 2026.