import { Injectable } from '@nestjs/common';
import { DetectionService } from '../detection/detection.service';
import { EnrichmentService } from '../enrichment/enrichment.service';
import { DeliveryService } from '../delivery/delivery.service';

@Injectable()
export class IngestionService {
  constructor(
    private readonly detectionService: DetectionService,
    private readonly enrichmentService: EnrichmentService,
    private readonly deliveryService: DeliveryService,
  ) {}

  async handleIncoming(payload: any) {
    console.log(`Received payload for ${payload.company}`);

    // Gate 1 — hash check
    if (!this.detectionService.isChanged(payload.snapshot_id, payload.text_diff)) {
      return { status: 'discarded', reason: 'no change' };
    }

    // Gate 2 — materiality filter
    if (!this.detectionService.isMaterial(payload.text_diff)) {
      return { status: 'discarded', reason: 'cosmetic change' };
    }

    // Gate 3 — Claude enrichment
    console.log(`Material change detected for ${payload.company} — calling enrichment`);
    const analysis = await this.enrichmentService.analyze(payload);

    // Gate 4 — Socket.io delivery
    const alert = {
      company: payload.company,
      ticker: payload.ticker,
      source_url: payload.source_url,
      captured_at: payload.captured_at,
      ...analysis,
    };
    this.deliveryService.sendAlert(alert);

    return { status: 'enriched', alert };
  }
}