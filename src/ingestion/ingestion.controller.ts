import { Controller, Post, Body } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

export class IngestDto {
  company: string;
  ticker: string;
  source_url: string;
  text_diff: string;
  snapshot_id: string;
  captured_at: string;
}

@Controller('ingest')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  async receive(@Body() payload: IngestDto) {
    await this.ingestionService.handleIncoming(payload);
    return { status: 'received' };
  }
}