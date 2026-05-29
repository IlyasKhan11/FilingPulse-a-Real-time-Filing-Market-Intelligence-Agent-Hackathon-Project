import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryGateway } from './delivery.gateway';

describe('DeliveryGateway', () => {
  let gateway: DeliveryGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryGateway],
    }).compile();

    gateway = module.get<DeliveryGateway>(DeliveryGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
