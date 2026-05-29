// Demo "filing page" server + in-browser editor. No dependencies.
//   GET  /        -> serves the live filing page (this is what FilingPulse scrapes)
//   GET  /edit    -> in-browser editor (textarea + presets + live preview)  <-- open this for the video
//   GET  /raw     -> current index.html as plain text (used by the editor)
//   POST /save    -> overwrites index.html with the posted body
const http = require('http');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
const PORT = 8090;

// ---- One-click scenario presets (escalating, great for a demo) ----
const PRESETS = {
  baseline: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Acme Robotics — Investor Relations</title></head>
  <body>
    <nav>Home | Products | Investors | Careers | Contact</nav>
    <header><h1>Acme Robotics, Inc. (ACME)</h1><p>Investor Relations &amp; Regulatory Filings</p></header>
    <main>
      <section>
        <h2>Leadership</h2>
        <p>Chief Executive Officer: Jane Doe</p>
        <p>Chief Financial Officer: Robert Hale</p>
        <p>The Board of Directors confirmed no leadership changes this quarter.</p>
      </section>
      <section>
        <h2>Recent SEC Filings</h2>
        <ul>
          <li>10-Q — Quarterly Report — filed April 28, 2026</li>
          <li>8-K — Current Report — filed March 12, 2026</li>
        </ul>
      </section>
      <section>
        <h2>Investor Notice</h2>
        <p>The company reaffirms its full-year revenue guidance of $2.1 billion.</p>
      </section>
    </main>
    <footer>© 2026 Acme Robotics, Inc. All rights reserved.</footer>
  </body>
</html>
`,
  leadership: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Acme Robotics — Investor Relations</title></head>
  <body>
    <nav>Home | Products | Investors | Careers | Contact</nav>
    <header><h1>Acme Robotics, Inc. (ACME)</h1><p>Investor Relations &amp; Regulatory Filings</p></header>
    <main>
      <section>
        <h2>Leadership</h2>
        <p>Chief Executive Officer: Daniel Okoro (appointed, effective immediately)</p>
        <p>Chief Financial Officer: Priya Nair (interim)</p>
        <p>Former CEO Jane Doe has stepped down following the conclusion of an internal review, and former CFO Robert Hale has departed the company.</p>
        <p>The Board of Directors announced the resignation of two independent directors and the appointment of three new board members.</p>
      </section>
      <section>
        <h2>Recent SEC Filings</h2>
        <ul>
          <li>8-K — Item 5.02 Departure and Appointment of Officers — filed today</li>
          <li>10-Q — Quarterly Report — filed April 28, 2026</li>
        </ul>
      </section>
      <section>
        <h2>Investor Notice</h2>
        <p>The company reaffirms its full-year revenue guidance of $2.1 billion.</p>
      </section>
    </main>
    <footer>© 2026 Acme Robotics, Inc. All rights reserved.</footer>
  </body>
</html>
`,
  crisis: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Acme Robotics — Investor Relations</title></head>
  <body>
    <nav>Home | Products | Investors | Careers | Contact</nav>
    <header><h1>Acme Robotics, Inc. (ACME)</h1><p>Investor Relations &amp; Regulatory Filings</p></header>
    <main>
      <section>
        <h2>Leadership</h2>
        <p>Chief Executive Officer: Daniel Okoro (interim)</p>
        <p>Chief Financial Officer: position vacant</p>
        <p>The Board of Directors announced the resignation of the CEO and CFO amid an internal accounting review.</p>
      </section>
      <section>
        <h2>Recent SEC Filings</h2>
        <ul>
          <li>8-K — Item 8.01: the company has received a formal SEC investigation notice regarding prior revenue recognition — filed today</li>
          <li>8-K — Item 1.01: acquisition of Nimbus Drones for $480 million — filed today</li>
          <li>8-K — Item 2.05: restructuring plan to reduce global workforce by approximately 15% — filed today</li>
        </ul>
      </section>
      <section>
        <h2>Investor Notice</h2>
        <p>The company is lowering its full-year revenue guidance from $2.1 billion to $1.55 billion, citing weaker demand and supply-chain disruption.</p>
        <p>The Board has suspended the quarterly dividend until further notice.</p>
      </section>
    </main>
    <footer>© 2026 Acme Robotics, Inc. All rights reserved.</footer>
  </body>
</html>
`,
};

const EDITOR = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>FilingPulse · Demo Filing Editor</title>
<style>
  :root { --ink:#1a1813; --paper:#f4f1ea; --surface:#fbfaf6; --rule:#c8bfad; --muted:#837c70; --accent:#1f3a5f; }
  * { box-sizing:border-box; margin:0; }
  body { font-family:'IBM Plex Sans',system-ui,sans-serif; background:var(--paper); color:var(--ink); height:100vh; display:flex; flex-direction:column; }
  header { padding:16px 22px; border-bottom:2px solid var(--ink); display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; }
  h1 { font-family:Georgia,'Times New Roman',serif; font-size:1.4rem; letter-spacing:-.02em; }
  h1 i { color:var(--accent); }
  .hint { font-size:.8rem; color:var(--muted); }
  .bar { padding:12px 22px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; border-bottom:1px solid var(--rule); }
  .bar .lbl { font-size:.7rem; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); margin-right:4px; }
  button { font:inherit; font-size:.8rem; padding:8px 14px; border:1px solid var(--ink); background:transparent; color:var(--ink); cursor:pointer; }
  button:hover { background:var(--ink); color:var(--paper); }
  button.primary { background:var(--ink); color:var(--paper); }
  button.primary:hover { background:var(--accent); border-color:var(--accent); }
  main { flex:1; display:grid; grid-template-columns:1fr 1fr; min-height:0; }
  .pane { display:flex; flex-direction:column; min-height:0; }
  .pane.left { border-right:1px solid var(--rule); }
  .pane h2 { font-size:.68rem; text-transform:uppercase; letter-spacing:.14em; color:var(--muted); padding:10px 16px; border-bottom:1px solid var(--rule); }
  textarea { flex:1; border:none; resize:none; padding:16px; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:.82rem; line-height:1.5; background:var(--surface); color:var(--ink); outline:none; }
  iframe { flex:1; border:none; background:#fff; }
  footer { padding:12px 22px; border-top:1px solid var(--rule); font-size:.82rem; color:var(--muted); display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; }
  #status { color:var(--accent); font-weight:600; }
  @media (max-width:820px){ main{ grid-template-columns:1fr; } .pane.left{ border-right:none; border-bottom:1px solid var(--rule); } }
</style>
</head>
<body>
  <header>
    <h1>Filing<i>Pulse</i></h1>
    <span class="hint">Demo filing editor — edit the page, hit Save, then click <b>Scan Now</b> on ACME in the dashboard.</span>
  </header>
  <div class="bar">
    <span class="lbl">Scenarios</span>
    <button onclick="preset('baseline')">Calm baseline</button>
    <button onclick="preset('leadership')">Leadership shake-up</button>
    <button onclick="preset('crisis')">Crisis (SEC + guidance cut)</button>
    <span style="flex:1"></span>
    <button class="primary" onclick="save()">Save &amp; apply</button>
  </div>
  <main>
    <div class="pane left">
      <h2>Filing source (editable)</h2>
      <textarea id="src" spellcheck="false"></textarea>
    </div>
    <div class="pane">
      <h2>Live preview — http://localhost:${PORT}/</h2>
      <iframe id="prev" src="/"></iframe>
    </div>
  </main>
  <footer>
    <span id="status">Loading current page…</span>
    <span>Tip: pick a scenario, Save, then Scan Now → watch the alert appear.</span>
  </footer>
<script>
  var PRESETS = ${JSON.stringify(PRESETS)};
  var ta = document.getElementById('src');
  var prev = document.getElementById('prev');
  var statusEl = document.getElementById('status');
  function setStatus(m){ statusEl.textContent = m; }
  function load(){ fetch('/raw').then(function(r){ return r.text(); }).then(function(t){ ta.value = t; setStatus('Loaded current page. Edit or pick a scenario, then Save.'); }); }
  function preset(k){ ta.value = PRESETS[k]; setStatus('Loaded "' + k + '" scenario — click Save & apply.'); }
  function save(){
    setStatus('Saving…');
    fetch('/save', { method:'POST', headers:{ 'Content-Type':'text/plain' }, body: ta.value })
      .then(function(r){ return r.json(); })
      .then(function(){ setStatus('Saved ✓  Now click Scan Now on ACME in the dashboard.'); if(prev){ prev.contentWindow.location.reload(); } })
      .catch(function(e){ setStatus('Save failed: ' + e.message); });
  }
  load();
</script>
</body>
</html>
`;

http
  .createServer((req, res) => {
    try {
      if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          fs.writeFileSync(file, body, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, bytes: body.length }));
        });
        return;
      }
      if (req.url === '/edit') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(EDITOR);
        return;
      }
      if (req.url === '/raw') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(fs.readFileSync(file, 'utf8'));
        return;
      }
      // default: the live filing page (what FilingPulse scrapes)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      res.writeHead(500);
      res.end('server error: ' + e.message);
    }
  })
  .listen(PORT, () => {
    console.log(`Demo filing page:  http://localhost:${PORT}/`);
    console.log(`In-browser editor: http://localhost:${PORT}/edit   <-- open this for the video`);
  });
