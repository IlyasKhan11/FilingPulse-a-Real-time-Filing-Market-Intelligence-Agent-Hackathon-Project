# FilingPulse — Deck Outline & Narrative

> Hackathon pitch deck. Track: Finance & Market Intelligence.
> Flow: pain → solution → architecture → live demo → why Bright Data → market → team.
> Target: ~5 minutes total. Every slide has a speaker note.

---

## Slide 1 — Title

**On screen:**
- FilingPulse
- "Know the second it matters."
- Finance & Market Intelligence track

**Speaker note:**
> "FilingPulse is an AI agent that monitors company filings and investor-relations pages in real time, and pushes a structured alert the moment something material changes."

One sentence. Don't explain the stack, don't explain the problem yet. Just the name and the one-liner.

---

## Slide 2 — The pain

**On screen:**
- A compliance analyst has 40+ companies on their watchlist
- They refresh EDGAR, IR pages, court portals, and regulatory sites — manually
- Bloomberg terminal: ~$24k/year. Smaller teams can't afford it.
- The cost of finding out late: missed trade, missed risk, regulatory exposure

**Speaker note:**
> "If you're an analyst at a small fund, or you're on a compliance team, you need to know the *second* a company files something material. A new 8-K, a leadership change, a quietly edited investor-relations page. Today you either refresh pages by hand or pay $24,000 a year for a Bloomberg terminal. Smaller teams get priced out — and in finance, finding out late means a missed trade or a missed risk."

Pause here. Let the number land. $24k/year is the anchor that makes the rest of the pitch feel like a bargain.

---

## Slide 3 — What actually hurts

**On screen:**
Three real scenarios, one line each:
1. SMCI delays a 10-K filing → Nasdaq sends a delisting notice → stock drops 30% before your team sees the 8-K
2. Unilever quietly edits forward guidance language on their IR page → no SEC filing is triggered → you only find out when a journalist asks about it
3. Boeing's FAA airworthiness directive drops on a Friday afternoon → your fund holds BA → you learn about it Monday morning from a client

**Speaker note:**
> "These aren't hypotheticals. These are the kinds of events that happened in the last year. The common thread: the information was public. It was sitting on a website. Nobody was watching."

This slide exists to make the problem visceral. Three quick examples, then move.

---

## Slide 4 — The solution

**On screen:**
- Give FilingPulse a watchlist of companies
- It monitors their filing portals and IR pages continuously
- Flags only *material* changes — not cosmetic edits
- Pushes a structured alert: what changed, why it matters, confidence score, source link
- Live feed with per-company history

**Speaker note:**
> "FilingPulse takes a watchlist — say, 8 companies your compliance team cares about. It monitors their pages. When something changes, it doesn't just tell you the page changed — it tells you *what* changed, *why it matters*, how confident it is, and gives you the source link. All in real time, all in a live feed."

Keep this short. The architecture slide and demo will do the heavy lifting.

---

## Slide 5 — Architecture

**On screen:**
Pipeline diagram (left to right or top to bottom):

```
Trigger (scheduler / button)
    ↓
Bright Data ingestion
(SERP API → find pages · Web Unlocker → bypass bot detection)
    ↓
Normalize + hash
(strip noise, fingerprint the content)
    ↓
Change detection
(hash match → discard · hash differs → next gate)
    ↓
Materiality filter
(cosmetic edit → discard · real change → send to AI)
    ↓
AI enrichment
(Claude → structured JSON alert)
    ↓
Storage + delivery
(Postgres · Socket.io live feed)
```

**Speaker note:**
> "Here's the key insight. Most teams would send every scraped page to an LLM and ask 'did anything change?' That's expensive and slow. We don't do that. We have two cheap gates *before* the AI ever runs. First: a content hash. If the page hasn't changed at all, we're done — cost is zero. Second: a materiality filter. If the change is cosmetic — a date in the footer, a reformatted nav bar — we discard it. Only *real* changes reach the LLM. On roughly 95% of fetches, the AI never fires. That's how this stays fast and cheap."

This is the most important technical slide. The "two cheap gates" insight is what separates this from a naive implementation. Say it clearly, then move to the demo.

---

## Slide 6 — Live demo

**On screen:**
- The FilingPulse dashboard, live
- Watchlist visible: SMCI, MSTR, Unilever, Boeing, Carvana, Tesla, Palantir, JPMorgan
- "Scan now" button

**Speaker note:**
> "Let me show you. Here's our watchlist — 8 real companies, each chosen because they represent a different compliance risk. I'm going to hit Scan Now."

[Click Scan Now]

> "Bright Data is hitting their IR pages and EDGAR filings right now. Watch the feed."

[Wait for alerts to populate]

> "There — [company name] just had a change. FilingPulse detected it, classified it as material, and here's the structured alert. What changed. Why it matters. Confidence: high. Source link — click it, you'll see the actual filing."

**Demo plan:**
- Have MSTR queued as the most reliable — they file 8-Ks so frequently that there's almost certainly a recent one
- If nothing fires live, have a pre-scanned result from earlier in the day ready as a fallback ("here's what it caught this morning")
- Show the alert JSON: `what_changed`, `why_it_matters`, `confidence`, `source_url`
- Click the source link to prove it's real

---

## Slide 7 — Why Bright Data

**On screen:**
- "Without Bright Data, this product doesn't work."
- Three specific reasons:
  1. SEC EDGAR aggressively rate-limits and blocks automated scrapers
  2. Corporate IR pages use Cloudflare, Akamai, and geo-blocking — a raw HTTP request gets a 403
  3. Many filing portals are JS-rendered — there's no HTML to parse without a real browser

**Speaker note:**
> "I want to be direct about this: without Bright Data, FilingPulse cannot exist. This isn't a convenience layer. SEC EDGAR rate-limits automated requests. Corporate IR pages — Boeing, Unilever, JPMorgan — are behind Cloudflare and Akamai. You get a 403 with a plain HTTP request. And many of these portals are fully JavaScript-rendered — there's literally no content in the HTML without a real browser session. Bright Data's Web Unlocker and SERP API solve all three problems. We use BullMQ to rate-limit our own jobs so we don't burn credits, and Web Unlocker handles the rest."

This is the slide judges care about most. Be specific. Name the actual blockers. Don't say "Bright Data helps with scraping" — say *why* the alternative is impossible.

---

## Slide 8 — Watchlist: why these companies

**On screen:**
Summary table — keep it tight:

| Company | What we monitor | Why compliance cares |
|---|---|---|
| SMCI | 10-K delays, auditor 8-Ks | Delisting risk from internal controls failure |
| MSTR | Bitcoin purchase 8-Ks, debt offerings | Leverage from crypto treasury strategy |
| Unilever | IR page edits, ESG disclosures | Changes that happen *outside* EDGAR |
| Boeing | FAA directives, DOJ updates, 10-Q | Multi-regulator risk beyond SEC |
| Carvana | Credit amendments, going concern | Footnote-level balance sheet risk |
| Tesla | 13D filings, proxy statements | CEO disclosure and governance risk |
| Palantir | Contract award 8-Ks | Government contract concentration |
| JPMorgan | Stress tests, regulatory 8-Ks | High-noise filter stress test |

**Speaker note:**
> "We didn't pick random tickers. Each company on this watchlist represents a *different* kind of compliance risk and a *different* filing type. SMCI is about filing delays. MicroStrategy is about filing frequency. Unilever is the one that proves we're not just watching EDGAR — we're watching the IR page itself. Boeing proves we can monitor FAA and DOJ, not just the SEC. And JPMorgan is our stress test — their page changes constantly, but almost nothing is material. That's where the materiality filter earns its keep."

Don't read the table. Pick 3–4 companies and tell their story in one sentence each. The table is for the judges to photograph.

---

## Slide 9 — Market opportunity

**On screen:**
- Bloomberg Terminal: ~$24k/user/year — designed for trading desks, not compliance teams
- Compliance monitoring market: growing, driven by regulation (SEC, EU CSRD, UK FCA)
- The gap: no tool exists that monitors *both* formal filings and informal IR page changes at this price point
- Target users: small/mid-size funds, compliance teams at fintechs, independent analysts, IR consultants

**Speaker note:**
> "Bloomberg is $24,000 a year per seat. It's built for traders, not compliance teams. The compliance monitoring market is growing fast — driven by SEC enforcement, EU sustainability disclosure rules, and FCA requirements in the UK. But there's a gap: no affordable tool watches both formal SEC filings *and* informal IR page changes in real time. That's the gap FilingPulse fills. Our users are small funds, compliance teams at fintechs, and independent analysts who can't justify a Bloomberg terminal but can't afford to miss a material filing."

Note: the $24k Bloomberg figure is widely cited but approximate — you may want to verify the current pricing if a judge asks. The compliance monitoring market size is growing but I don't have a verified dollar figure to cite here. If you want to include a TAM number, source it from a recent industry report.

---

## Slide 10 — Tech stack (quick hit)

**On screen:**
Single-row icon layout:

- NestJS (orchestration)
- BullMQ + Redis (job queue, rate-limiting)
- Bright Data (SERP API + Web Unlocker)
- Claude (AI enrichment)
- Postgres (storage)
- Socket.io (live feed)

Optional: Cognee (per-company memory) — partner prize

**Speaker note:**
> "Quick stack overview. NestJS backend, one module per pipeline layer. BullMQ on Redis handles the job queue — that's what protects our Bright Data credits with rate-limiting and retries. Bright Data for ingestion. Claude for the AI parse. Postgres for storage. Socket.io for the live feed. If we have time: Cognee for per-company memory, which is our hook for the partner prize."

15 seconds max. Don't linger here. Judges want to know you built it, not hear a tech tutorial.

---

## Slide 11 — What's next (if we had more time)

**On screen:**
- Scheduled monitoring every 15 minutes (currently: manual scan button)
- Webhook + email alerts
- Semantic search across historical alerts (pgvector)
- Cognee memory for cross-filing context ("this is the third time SMCI has delayed a 10-K")
- Multi-user watchlists with role-based access

**Speaker note:**
> "Right now we have a scan button. In production, this runs on a 15-minute schedule. We'd add webhook and email alerts, semantic search across your alert history, and Cognee memory so the system can say 'this is the third time this company has delayed a filing — that's a pattern, not an incident.' We scoped to what we could build in three days. This is what comes next."

This slide signals maturity. You know what you didn't build and you know why.

---

## Slide 12 — Team

**On screen:**
- Team member names, roles, and one line each
- (Fill in your actual team details)

**Speaker note:**
> Keep it to 15 seconds. Names, what each person built, done.

---

## Slide 13 — Closing

**On screen:**
- FilingPulse
- "Know the second it matters."
- QR code or link to the repo / live demo

**Speaker note:**
> "FilingPulse. Real-time filing intelligence for the teams that can't afford to find out late. Thank you."

End clean. Don't add new information. Don't hedge. Last words should be confident.

---

## Appendix — Presentation tips

**Timing guide (5 minutes total):**
- Slides 1–3 (pain): 60 seconds
- Slide 4 (solution): 30 seconds
- Slide 5 (architecture): 45 seconds
- Slide 6 (live demo): 60 seconds
- Slide 7 (why Bright Data): 45 seconds
- Slides 8–9 (watchlist + market): 30 seconds
- Slides 10–13 (stack, roadmap, team, close): 30 seconds

**If the demo breaks:**
Have a screenshot of a successful alert ready on the next slide. Say: "Here's what it caught earlier today" and keep moving. Never debug on stage.

**Anticipated judge questions:**
1. "How do you handle pages that change every load?" → "The normalize step strips dynamic content — timestamps, session tokens, ad blocks — before hashing. Only the substantive content is fingerprinted."
2. "What's the false positive rate?" → "We haven't measured it formally yet. The materiality filter catches most cosmetic changes, but tuning it is the main post-hackathon priority."
3. "Why not just use the SEC EDGAR RSS feed?" → "EDGAR RSS covers formal filings. It doesn't cover IR page edits, court docket updates, or FAA directives. FilingPulse monitors the pages themselves, not just the feed."
4. "How is this different from a Google Alert?" → "Google Alerts tell you a page was indexed. We tell you *what changed*, *why it matters*, and give you a confidence score. Google Alerts also don't work on bot-protected pages — which is most of our targets."
