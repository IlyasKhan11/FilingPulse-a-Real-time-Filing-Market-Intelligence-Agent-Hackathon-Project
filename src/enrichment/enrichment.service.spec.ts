import { Test, TestingModule } from '@nestjs/testing';
import { EnrichmentService } from './enrichment.service';

describe('EnrichmentService', () => {
  let service: EnrichmentService;
  const payload = {
    company: 'Example Corp',
    ticker: 'EXM',
    source_url: 'https://example.com/investors',
    text_diff:
      'Example Corp filed an 8-K announcing updated revenue guidance for investors.',
    snapshot_id: 'https://example.com/investors',
    captured_at: '2026-05-29T00:00:00.000Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnrichmentService],
    }).compile();

    service = module.get<EnrichmentService>(EnrichmentService);
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns AIML analysis when the API succeeds', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  what_changed: 'Revenue guidance was updated.',
                  why_it_matters:
                    'Guidance changes are relevant to investors and compliance teams.',
                  confidence: 0.9,
                  severity: 'medium',
                  source_url: payload.source_url,
                }),
              },
            },
          ],
        }),
    } as Response);

    const result = await service.analyze(payload);

    expect(result.enrichment_provider).toBe('aiml');
    expect(result.what_changed).toBe('Revenue guidance was updated.');
    expect(result.severity).toBe('medium');
  });

  it('returns local fallback analysis when AIML rejects the request', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          error: {
            data: {
              kind: 'err_insufficent_credits',
            },
          },
        }),
    } as Response);

    const result = await service.analyze(payload);

    expect(result.enrichment_provider).toBe('local_fallback');
    expect(result.what_changed).toContain('8-K');
    expect(result.why_it_matters).toContain('Example Corp');
    expect(result.severity).toBe('medium');
  });
});
