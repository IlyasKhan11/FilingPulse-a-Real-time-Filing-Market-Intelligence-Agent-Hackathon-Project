import { BrightDataService } from './brightdata.service';

describe('BrightDataService', () => {
  let service: BrightDataService;

  beforeEach(() => {
    service = new BrightDataService();
  });

  it('normalizes html and removes page chrome', () => {
    const result = service.normalizeHtml(`
      <html>
        <body>
          <nav>Navigation links</nav>
          <main><h1>Important filing update</h1><p>Revenue &amp; guidance changed.</p></main>
          <footer>Legal footer</footer>
          <script>window.noise = true</script>
        </body>
      </html>
    `);

    expect(result).toBe('Important filing update Revenue & guidance changed.');
  });

  it('creates an ingest payload from fetched html', () => {
    const payload = service.createIngestPayload(
      'https://www.example.com/investors',
      '<main>Material investor relations update with enough content for review.</main>',
    );

    expect(payload.company).toBe('example.com');
    expect(payload.source_url).toBe('https://www.example.com/investors');
    expect(payload.snapshot_id).toBe('https://www.example.com/investors');
    expect(payload.text_diff).toContain('Material investor relations update');
  });
});
