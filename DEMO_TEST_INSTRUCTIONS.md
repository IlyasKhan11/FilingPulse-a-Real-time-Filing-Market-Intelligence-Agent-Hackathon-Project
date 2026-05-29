# FilingPulse — Live Change-Detection Test (for the demo video)

Goal: prove the pipeline detects a real filing change end-to-end (scrape → clean → SHA-256 →
diff → Claude → live alert). We use a small "filing page" we control so we can trigger the
change on command (real company pages don't change on cue).

Everything runs locally. Windows + PowerShell. ~10 minutes.

---

## Step 1 — Start the app (4 terminals, from the repo root)
If it's already running, skip to Step 4. Full detail is in `START_LOCAL.md`.

```powershell
docker compose up -d                 # terminal 0: Postgres + Redis
cd team-a; npm run start:dev         # terminal 1: Team A backend  (http://localhost:3000)
npm run start:dev                    # terminal 2: Team B backend  (http://localhost:4000)
cd frontend; npm run dev             # terminal 3: dashboard        (http://localhost:5173 or 5174)
```

> First time only on this machine: run the `npm install` + `npx prisma migrate dev` +
> `npx prisma db seed` block in `START_LOCAL.md` first.

Open the dashboard URL the frontend prints. You should see the **Live Feed** + a **Watchlist** of companies.

## Step 2 — Start the demo "filing page" (5th terminal, from repo root)
```powershell
node demo-page/serve.cjs
```
Leave it running. It serves an editable IR page at **http://localhost:8090**
(open it in a browser tab to see it — it's `demo-page/index.html`).

## Step 3 — Add the demo company to the watchlist
In the dashboard:
1. Click **Add Company**.
2. Fill in:
   - **Ticker:** `ACME`
   - **Company Name:** `Acme Robotics`
   - **Investor Relations URL:** `http://localhost:8090`
   - **SEC Filings URL:** `http://localhost:8090`   ← put the same URL here (skips auto-discovery)
3. Click **Add target**. "Acme Robotics" now appears in the **Watchlist**.

## Step 4 — Take the baseline snapshot
On the **Acme Robotics** card, click **Scan Now**.
- It fetches the page, cleans it, hashes it, and stores a baseline snapshot.
- The card's **Snapshots** count goes up. No alert yet — that's correct (nothing to compare to).

## Step 5 — START SCREEN RECORDING NOW
(Win + Alt + R for Xbox Game Bar, or your recorder of choice. Have the dashboard **Live Feed** tab visible.)

## Step 6 — Trigger a real change
1. Open `demo-page/index.html` in an editor (VS Code).
2. Find this line (it's marked with an arrow comment):
   ```
   The Board of Directors confirmed no leadership changes this quarter.
   ```
3. Replace it with something material, e.g.:
   ```
   Chief Financial Officer Robert Hale has resigned effective immediately; the Board has appointed Priya Nair as interim Chief Financial Officer.
   ```
4. **Save** the file. (The server serves the new content automatically.)

## Step 7 — Re-scan and watch the alert appear
Back in the dashboard, click **Scan Now** on Acme Robotics again.
Within a couple of seconds, a new alert pops into the **Live Feed** (it pulses):
- severity badge (should be **HIGH** for a leadership change), confidence %, timestamp, source link.

Click the alert to open the inspector → show the **colored diff** (red removed / green added),
the **"Why it matters"** Claude analysis, and **Verify Source**.

## Step 8 — Stop recording. Done. ✅

---

## Optional: also show the REAL companies
To show it scraping genuinely protected sites (Bright Data Web Unlocker), click **Scan Now**
on **Tesla** or **Palantir** — it really fetches their IR + SEC pages and stores baselines.
(They'll say "no change" on a second scan because the live pages didn't change — that's the
whole point of the cheap hash gate.)

## If something doesn't work
- **No alert after re-scan?** Make sure (a) `node demo-page/serve.cjs` is still running,
  (b) both backends are up, (c) your edit changed a whole sentence (tiny edits can be filtered
  as "cosmetic"). Re-save and scan again.
- **"Company already in watchlist"** when adding ACME again → it's already there; just use it.
- **Reset the feed** (start clean for a re-take): in a terminal —
  `docker exec filingpulse-postgres psql -U filingpulse -d filingpulse_db -c "DELETE FROM alerts;"`
  then refresh the dashboard.
