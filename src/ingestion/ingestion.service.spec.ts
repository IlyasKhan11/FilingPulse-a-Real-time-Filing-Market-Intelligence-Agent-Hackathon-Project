import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { DetectionService } from '../detection/detection.service';
import { EnrichmentService } from '../enrichment/enrichment.service';
import { DeliveryService } from '../delivery/delivery.service';
import { BrightDataService } from './brightdata.service';

describe('IngestionService', () => {
  let service: IngestionService;
  const detectionService = {
    isChanged: jest.fn(),
    isMaterial: jest.fn(),
  };
  const enrichmentService = {
    analyze: jest.fn(),
  };
  const deliveryService = {
    sendAlert: jest.fn(),
  };
  const brightDataService = {
    fetchPage: jest.fn(),
    createIngestPayload: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: DetectionService,
          useValue: detectionService,
        },
        {
          provide: EnrichmentService,
          useValue: enrichmentService,
        },
        {
          provide: DeliveryService,
          useValue: deliveryService,
        },
        {
          provide: BrightDataService,
          useValue: brightDataService,
        },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('scans a URL through Bright Data, enrichment, and delivery', async () => {
    brightDataService.fetchPage.mockResolvedValue(
      '<main>Example Corp filed an 8-K announcing updated revenue guidance.</main>',
    );
    brightDataService.createIngestPayload.mockReturnValue({
      company: 'Example Corp',
      ticker: 'EXM',
      source_url: 'https://example.com/investors',
      text_diff:
        'Example Corp filed an 8-K announcing updated revenue guidance.',
      snapshot_id: 'https://example.com/investors',
      captured_at: '2026-05-29T00:00:00.000Z',
    });
    detectionService.isChanged.mockReturnValue(true);
    detectionService.isMaterial.mockReturnValue(true);
    enrichmentService.analyze.mockResolvedValue({
      what_changed: 'Revenue guidance was updated.',
      why_it_matters: 'Guidance changes are relevant to investors.',
      confidence: 0.9,
      severity: 'medium',
      source_url: 'https://example.com/investors',
      enrichment_provider: 'local_fallback',
    });

    const result = await service.scanUrl('https://example.com/investors');

    expect(brightDataService.fetchPage).toHaveBeenCalledWith(
      'https://example.com/investors',
    );
    expect(enrichmentService.analyze).toHaveBeenCalled();
    expect(deliveryService.sendAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        company: 'Example Corp',
        what_changed: 'Revenue guidance was updated.',
        enrichment_provider: 'local_fallback',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'scanned',
        source: 'bright_data_web_unlocker',
        normalized_chars: 62,
      }),
    );
  });
});
