import { Injectable } from '@nestjs/common';
import { DetectionService } from '../detection/detection.service';
import { EnrichmentService } from '../enrichment/enrichment.service';
import { DeliveryService } from '../delivery/delivery.service';
import { BrightDataService } from './brightdata.service';
import { FilingAlert, IngestPayload } from './ingestion.types';

@Injectable()
export class IngestionService {
  constructor(
    private readonly detectionService: DetectionService,
    private readonly enrichmentService: EnrichmentService,
    private readonly deliveryService: DeliveryService,
    private readonly brightDataService: BrightDataService,
  ) {}

  async scanUrl(url: string) {
    const html = await this.brightDataService.fetchPage(url);
    const payload = this.brightDataService.createIngestPayload(url, html);
    const ingestion = await this.handleIncoming(payload);

    return {
      status: 'scanned',
      source: 'bright_data_web_unlocker',
      source_url: payload.source_url,
      fetched_bytes: html.length,
      normalized_chars: payload.text_diff.length,
      ingestion,
    };
  }

  async handleIncoming(payload: IngestPayload) {
    console.log(`Received payload for ${payload.company}`);

    // Gate 1 - hash check
    if (
      !this.detectionService.isChanged(payload.snapshot_id, payload.text_diff)
    ) {
      return { status: 'discarded', reason: 'no change' };
    }

    // Gate 2 - materiality filter
    if (!this.detectionService.isMaterial(payload.text_diff)) {
      return { status: 'discarded', reason: 'cosmetic change' };
    }

    // Gate 3 - Claude enrichment
    console.log(
      `Material change detected for ${payload.company} - calling enrichment`,
    );
    const analysis = await this.enrichmentService.analyze(payload);

    // Gate 4 - Socket.io delivery
    const alert: FilingAlert = {
      ...analysis,
      company: payload.company,
      ticker: payload.ticker,
      source_url: payload.source_url,
      captured_at: payload.captured_at,
    };
    this.deliveryService.sendAlert(alert);

    return { status: 'enriched', alert };
  }
}
