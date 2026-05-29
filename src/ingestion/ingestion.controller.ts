import { Controller, Post, Body } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

// JSON contract Team A POSTs in (the normalized change diff).
export class IngestDto {
  companyId: string;
  companyName: string;
  ticker: string;
  sourceUrl: string;
  scannedAt: string;
  previousHash: string;
  currentHash: string;
  previousNormalizedText: string;
  currentNormalizedText: string;
  diff: string;
}

@Controller('ingest')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  async receive(@Body() payload: IngestDto) {
    const result = await this.ingestionService.handleIncoming(payload);
    return { received: true, result };
  }
}