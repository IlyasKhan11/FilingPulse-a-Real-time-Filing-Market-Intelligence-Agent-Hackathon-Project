import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IngestionModule } from './ingestion/ingestion.module';
import { DetectionModule } from './detection/detection.module';
import { EnrichmentModule } from './enrichment/enrichment.module';
import { DeliveryModule } from './delivery/delivery.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    IngestionModule,
    DetectionModule,
    EnrichmentModule,
    DeliveryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}