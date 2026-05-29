import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryGateway } from './delivery.gateway';

@Module({
  providers: [DeliveryService, DeliveryGateway],
  exports: [DeliveryService],
})
export class DeliveryModule {}