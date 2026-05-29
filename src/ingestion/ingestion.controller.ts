import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestPayload } from './ingestion.types';

export class IngestDto implements IngestPayload {
  company = '';
  ticker = '';
  source_url = '';
  text_diff = '';
  snapshot_id = '';
  captured_at = '';
}

@Controller()
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('ingest')
  async receive(@Body() payload: IngestDto) {
    await this.ingestionService.handleIncoming(payload);
    return { status: 'received' };
  }

  @Get('scan')
  async scan(@Query('url') url: string) {
    return this.ingestionService.scanUrl(url);
  }
}
