// Tiny static server for the demo "filing page". No dependencies.
// Re-reads index.html on every request, so edits show up on the next scan.
const http = require('http');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
const PORT = 8090;

http
  .createServer((req, res) => {
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      res.writeHead(500);
      res.end('error reading index.html: ' + e.message);
    }
  })
  .listen(PORT, () => {
    console.log(`Demo filing page running at http://localhost:${PORT}`);
    console.log('Edit demo-page/index.html and re-scan to trigger a change.');
  });
