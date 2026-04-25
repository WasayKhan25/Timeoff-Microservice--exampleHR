import { Test, TestingModule } from '@nestjs/testing';
import { MockHcmController } from './mock-hcm.controller';
import { MockHcmService } from './mock-hcm.service';

describe('MockHcmController', () => {
  let controller: MockHcmController;

  const mockMockHcmService = {
    getBalance: jest.fn(),
    setBalance: jest.fn(),
    deductBalance: jest.fn(),
    triggerBatchSync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MockHcmController],
      providers: [
        { provide: MockHcmService, useValue: mockMockHcmService },
      ],
    }).compile();

    controller = module.get<MockHcmController>(MockHcmController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
