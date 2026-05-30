import { Module } from '@nestjs/common';
import { BrightDataService } from './bright-data.service';
import { NormalizerService } from './normalizer.service';
import { PipelineService } from './pipeline.service';
import { AlertGateway } from './alert.gateway';

@Module({
  providers: [
    BrightDataService,
    NormalizerService,
    PipelineService,
    AlertGateway,
  ],
  exports: [
    PipelineService,
    AlertGateway,
    BrightDataService,
  ],
})
export class PipelineModule {}
