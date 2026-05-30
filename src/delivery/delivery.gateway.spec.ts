import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryGateway } from './delivery.gateway';
import { DeliveryService } from './delivery.service';

describe('DeliveryGateway', () => {
  let gateway: DeliveryGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryGateway,
        {
          provide: DeliveryService,
          useValue: {
            setServer: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<DeliveryGateway>(DeliveryGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
