import { Injectable } from '@nestjs/common';
import { DetectionService } from '../detection/detection.service';
import { EnrichmentService } from '../enrichment/enrichment.service';

@Injectable()
export class IngestionService {
  constructor(
    private readonly detectionService: DetectionService,
    private readonly enrichmentService: EnrichmentService,
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
    console.log(`Enrichment complete:`, analysis);
    return { status: 'enriched', analysis };
  }
}