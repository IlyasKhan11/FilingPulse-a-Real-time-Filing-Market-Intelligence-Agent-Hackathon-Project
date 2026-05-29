# FilingPulse — Demo Watchlist

TRANSLATION FOR NON-FINANCE HUMANS:  
**The basic idea**  
In the US, public companies are legally required to file regular reports with the SEC (the Securities and Exchange Commission — the government body that oversees financial markets). These aren't optional press releases. They're mandatory, standardized documents. The SEC publishes them all on a free public database called EDGAR, which is what FilingPulse monitors.

**The main filing types**  
- **10-K** — the annual report. Once a year, every public company must file a comprehensive account of their entire business: financials, risks, legal troubles, how the business actually works. Think of it as the full yearly checkup. It's long — often 100–300 pages. When a company files it late, that's a red flag. It usually means something is wrong internally.  
- **10-Q** — the quarterly report. The same idea as a 10-K but filed three times a year (Q1, Q2, Q3 — the 10-K covers Q4 and the full year). Shorter, less audited, but still legally binding. Compliance teams read these closely because companies sometimes quietly bury bad news in them.  
- **8-K** — the "something just happened" filing. A company must file this within four business days of any major event: a CEO resigns, they sign a big contract, they get sued, they buy something, they miss a debt payment. It's the most time-sensitive filing — when one drops, it usually matters right now. This is the filing type FilingPulse is most designed to catch.  
- **S-3 / 424B** — fundraising documents. Filed when a company wants to issue new shares or new debt to raise money. The S-3 is the registration, the 424B is the final prospectus (the "here's exactly what we're selling" document). For a company like MicroStrategy, these appear constantly because they keep borrowing money to buy Bitcoin.  
- **DEF 14A (Proxy statement)** — the document sent to shareholders before the annual vote. It contains executive pay, board member details, and any shareholder proposals. Compliance teams at institutional investors read these carefully because they vote on behalf of their clients.  
- **13D / 13G** — ownership disclosure. Filed when someone acquires more than 5% of a company's shares. The 13D is for "active" investors who might want to influence the company; the 13G is for "passive" ones. The Tesla entry references this because Elon Musk was famously late filing his 13D when he was quietly buying Twitter shares — which is an SEC violation.  

**The footnote effect**  
Several entries mention "footnotes." In any of these filings, the main financial tables (revenue, profit, etc.) are what most people read. But accountants are required to explain their assumptions and disclose risks in the footnotes — small-print sections at the back. Companies sometimes place genuinely alarming information there, knowing most readers won't reach it. A compliance team always reads the footnotes. FilingPulse is designed to flag when footnote language changes between filings, because that change is often the real signal.

**Going concern language**  
This is a specific phrase auditors use in a filing when they have "substantial doubt" about whether a company can survive the next 12 months. It's the closest thing to a formal warning that a company might go bankrupt. When this phrase appears — or disappears — in a filing, it's an immediate alert for any compliance or credit team.





> 8 companies curated for the hackathon live demo.
> Stars (⭐) mark the top 5 recommended.
---

## ⭐ 1. Super Micro Computer
**Ticker:** SMCI
**URL:** https://ir.supermicro.com

| Field | Detail |
|---|---|
| **Why compliance cares** | Filing delays and auditor changes are direct Nasdaq delisting triggers. Any 8-K disclosing a SOX 302/404 internal controls weakness demands immediate escalation. |
| **Demo angle** | High probability of recent EDGAR activity. Best candidate for a live scan on stage. |
| **Primary filing trigger** | 10-K/10-Q delays · Auditor resignation 8-K |
| **Core compliance risk** | Internal controls failure / delisting risk |

---

## ⭐ 2. MicroStrategy
**Ticker:** MSTR
**URL:** https://www.microstrategy.com/investor-relations

| Field | Detail |
|---|---|
| **Why compliance cares** | Files an 8-K for nearly every Bitcoin purchase. New FASB fair-value rules mean Bitcoin price swings flow directly into net income — each debt issuance to fund crypto is a material leverage event. |
| **Demo angle** | Highest filing frequency on the list. Near-guaranteed to have a new filing in any short demo window. |
| **Primary filing trigger** | Bitcoin purchase 8-Ks · S-3 / 424B debt offerings |
| **Core compliance risk** | Leverage and dilution from crypto treasury strategy |

---

## ⭐ 3. Unilever
**Ticker:** UL
**URL:** https://www.unilever.com/investor-relations

| Field | Detail |
|---|---|
| **Why compliance cares** | Quiet edits to IR pages — revised sustainability reports, updated modern slavery statements, tweaked forward guidance — are not always accompanied by a formal SEC filing. A hash monitor catches what EDGAR-watching misses entirely. |
| **Demo angle** | Best "quiet edit" moment on the list. Most visually compelling for an audience who assumes only EDGAR matters. |
| **Primary filing trigger** | IR page edits · Sustainability / ESG disclosure updates |
| **Core compliance risk** | Undisclosed IR changes not captured by formal filing feeds |

---

## ⭐ 4. Boeing
**Ticker:** BA
**URL:** https://investors.boeing.com

| Field | Detail |
|---|---|
| **Why compliance cares** | Multi-regulator exposure: SEC filings, FAA airworthiness directives, and DOJ deferred prosecution agreement updates are all public and all material. No other company on this list requires monitoring across three separate regulatory portals. |
| **Demo angle** | Proves the tool goes beyond EDGAR — FAA and DOJ portals are equally valid monitored sources. |
| **Primary filing trigger** | FAA airworthiness directives · DOJ DPA updates · Production liability 10-Q disclosures |
| **Core compliance risk** | Operational and legal liability across multiple regulators simultaneously |

---

## ⭐ 5. Carvana
**Ticker:** CVNA
**URL:** https://investors.carvana.com

| Field | Detail |
|---|---|
| **Why compliance cares** | Complex debt restructuring history. Changes to going concern language or debt covenant disclosures buried in 10-Q footnotes are easy to miss but immediately material to credit teams and fiduciaries. |
| **Demo angle** | The "footnote effect" in action — top-line numbers look stable while the real risk is in the footnotes. |
| **Primary filing trigger** | Credit facility amendment 8-Ks · Going concern language changes |
| **Core compliance risk** | Covenant breach / balance sheet deterioration signaled in footnotes |

---

## 6. Tesla
**Ticker:** TSLA
**URL:** https://ir.tesla.com

| Field | Detail |
|---|---|
| **Why compliance cares** | Elon Musk's disclosure history is itself a compliance risk — late 13D filings, SEC settlement terms, and the ongoing question of whether public statements constitute material disclosures. Proxy statements around board independence and executive compensation are closely watched. |
| **Demo angle** | Unique "celebrity CEO disclosure risk" narrative. No other company on the list tells this story. |
| **Primary filing trigger** | 13D amendments · Proxy / DEF 14A · Leadership 8-Ks |
| **Core compliance risk** | CEO disclosure compliance and board governance |

---

## 7. Palantir
**Ticker:** PLTR
**URL:** https://investors.palantir.com

| Field | Detail |
|---|---|
| **Why compliance cares** | Revenue is heavily concentrated in government contracts. A single contract award or termination crosses the materiality threshold for an 8-K. Contract concentration risk means one filing can reshape the entire revenue outlook. |
| **Demo angle** | Only company on the list where a contract notice — not a financial restatement — is the primary alert trigger. |
| **Primary filing trigger** | Government contract award / termination 8-Ks · Forward guidance updates |
| **Core compliance risk** | Government contract concentration — single award or termination is existential |

---

## 8. JPMorgan Chase
**Ticker:** JPM
**URL:** https://www.jpmorganchase.com/ir

| Field | Detail |
|---|---|
| **Why compliance cares** | Fed stress test disclosures, Basel III capital ratio updates, and any consent order or regulatory action 8-K are all material. The IR page changes constantly, making it the ideal stress test for the materiality filter. |
| **Demo angle** | High-noise baseline. Shows the filter working: many page changes, very few that are actually material. |
| **Primary filing trigger** | Fed stress test disclosures · Regulatory action 8-Ks · Capital ratio updates |
| **Core compliance risk** | Regulatory capital requirements and enforcement actions |

---

## Summary

| # | Company | Ticker | Primary Filing Trigger | Core Compliance Risk |
|---|---|---|---|---|
| ⭐ 1 | Super Micro Computer | SMCI | 10-K/10-Q delays, auditor 8-K | Internal controls / delisting risk |
| ⭐ 2 | MicroStrategy | MSTR | Bitcoin purchase 8-Ks, S-3 offerings | Leverage & dilution from crypto strategy |
| ⭐ 3 | Unilever | UL | IR page edits, ESG disclosures | Undisclosed changes outside EDGAR |
| ⭐ 4 | Boeing | BA | FAA directives, DOJ DPA, 10-Q liability | Multi-regulator operational risk |
| ⭐ 5 | Carvana | CVNA | Credit amendment 8-Ks, going concern | Covenant breach in footnotes |
| 6 | Tesla | TSLA | 13D amendments, proxy, leadership 8-Ks | CEO disclosure & board governance |
| 7 | Palantir | PLTR | Contract award/termination 8-Ks | Government contract concentration |
| 8 | JPMorgan Chase | JPM | Stress test, regulatory action 8-Ks | Capital requirements & enforcement |
