import { Test, TestingModule } from '@nestjs/testing';
import { MockHcmService } from './mock-hcm.service';

describe('MockHcmService', () => {
  let service: MockHcmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockHcmService],
    }).compile();

    service = module.get<MockHcmService>(MockHcmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
