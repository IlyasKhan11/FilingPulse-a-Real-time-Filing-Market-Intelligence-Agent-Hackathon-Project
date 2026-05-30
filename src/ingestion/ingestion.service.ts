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
    console.log(`Received change payload for ${payload.companyName} (${payload.ticker})`);

    // Normalize Team A's contract into the fields the gates use.
    const textDiff = payload.diff ?? payload.text_diff ?? '';
    const sourceUrl = payload.sourceUrl ?? payload.source_url ?? '';
    const company = payload.companyName ?? payload.company ?? '';
    // Key the hash gate by the page URL (Team A sends one payload per changed page).
    const snapshotKey = payload.currentHash ?? sourceUrl;

    // Gate 1 — hash check (cheap): identical diff already seen → discard.
    if (!this.detectionService.isChanged(snapshotKey, textDiff)) {
      return { status: 'discarded', reason: 'no change' };
    }

    // Gate 2 — materiality filter (cheap): cosmetic changes never reach Claude.
    if (!this.detectionService.isMaterial(textDiff)) {
      return { status: 'discarded', reason: 'cosmetic change' };
    }

    // Gate 3 — Claude enrichment (expensive): only material changes get here.
    console.log(`Material change detected for ${company} — calling enrichment`);
    const analysis = await this.enrichmentService.analyze({
      company,
      ticker: payload.ticker,
      source_url: sourceUrl,
      text_diff: textDiff,
    });

    // Gate 4 — deliver: persist + broadcast via Team A, plus local Socket.io.
    const alert = {
      companyId: payload.companyId,
      company,
      ticker: payload.ticker,
      sourceUrl,
      capturedAt: payload.scannedAt ?? payload.captured_at,
      diff: textDiff,
      ...analysis,
    };
    await this.deliveryService.sendAlert(alert);

    return { status: 'enriched', alert };
  }
}