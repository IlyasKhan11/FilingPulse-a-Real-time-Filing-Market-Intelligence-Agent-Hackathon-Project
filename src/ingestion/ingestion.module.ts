import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { DetectionModule } from '../detection/detection.module';
import { EnrichmentModule } from '../enrichment/enrichment.module';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [DetectionModule, EnrichmentModule, DeliveryModule],
  controllers: [IngestionController],
  providers: [IngestionService],
})
export class IngestionModule {}