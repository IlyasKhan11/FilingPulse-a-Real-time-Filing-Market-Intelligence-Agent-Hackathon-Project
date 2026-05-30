# FilingPulse — Start Locally (4 terminals)

Prereqs: **Docker Desktop running**, Node 20+. First time only, see "First-time setup" at the bottom.

Everything talks over localhost:
- Team A backend → http://localhost:3000  (REST + Socket.io + the dashboard data)
- Team B backend → http://localhost:4000  (AI core: hash → materiality → Claude)
- Frontend (dashboard) → http://localhost:5173  (or 5174 if 5173 is busy)
- Postgres + Redis → Docker

## Start (run each block in its own terminal, from the repo root)

**0) Database (once per session)**
```powershell
docker compose up -d
```

**1) Team A backend (port 3000)**
```powershell
cd team-a
npm run start:dev
```

**2) Team B backend (port 4000)**
```powershell
npm run start:dev
```

**3) Frontend (port 5173)**
```powershell
cd frontend
npm run dev
```

Then open the URL the frontend prints (http://localhost:5173 or :5174).

## Demo flow in the browser
1. **Watchlist** tab → 8 seeded companies.
2. Click **Simulate Change** on any company → an alert appears in the **Live Feed** in real time.
   (This pushes a material diff through the full real pipeline: Team A → Team B → Claude → back to Team A → live feed.)
3. Click an alert → inspector shows the colored diff, severity, confidence, "why it matters".
4. **Scan Now** runs a real Bright Data scrape (1st scan = baseline; identical re-scans are discarded by the hash gate).

## Stop
```powershell
# Ctrl+C in each app terminal, then:
docker compose down          # add -v to also wipe the database
```

---

## First-time setup (only once)
```powershell
# from repo root
docker compose up -d

# Team A
cd team-a
npm install
npx prisma generate
npx prisma migrate dev          # creates companies/snapshots/alerts tables
npx prisma db seed              # loads the 8-company demo watchlist
cd ..

# Team B (repo root)
npm install

# Frontend
cd frontend
npm install
cd ..
```

Environment files already exist:
- `team-a/.env` — Bright Data keys + `DATABASE_URL` (points at the Docker Postgres) + `TEAM_B_WEBHOOK_URL=http://localhost:4000/ingest`
- `.env` (root, Team B) — `PORT=4000`, `AIML_API_KEY` (real Claude), `TEAM_A_ALERT_URL=http://localhost:3000/api/alerts`

> If you ever see no alerts on **Simulate Change**: make sure both backends AND `docker compose up -d` are running.
