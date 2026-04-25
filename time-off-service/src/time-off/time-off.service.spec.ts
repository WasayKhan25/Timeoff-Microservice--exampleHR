import { Test, TestingModule } from '@nestjs/testing';
import { TimeOffService } from './time-off.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TimeOffBalance } from '../entities/time-off-balance.entity';
import { TimeOffRequest, RequestStatus } from '../entities/time-off-request.entity';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TimeOffService', () => {
  let service: TimeOffService;
  
  const mockBalanceRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRequestRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    manager: mockQueryRunner.manager,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeOffService,
        { provide: getRepositoryToken(TimeOffBalance), useValue: mockBalanceRepository },
        { provide: getRepositoryToken(TimeOffRequest), useValue: mockRequestRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<TimeOffService>(TimeOffService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBalance', () => {
    it('should return local balance if not stale', async () => {
      const mockBalance = { balanceDays: 10, lastSyncedAt: new Date() };
      mockBalanceRepository.findOne.mockResolvedValue(mockBalance);

      const result = await service.getBalance('emp1', 'loc1');
      expect(result).toBe(10);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should fetch from HCM if stale', async () => {
      const mockBalance = { balanceDays: 10, lastSyncedAt: new Date(Date.now() - 100000) };
      mockBalanceRepository.findOne.mockResolvedValue(mockBalance);
      mockedAxios.get.mockResolvedValue({ data: { balanceDays: 15 } });
      
      const result = await service.getBalance('emp1', 'loc1');
      
      expect(result).toBe(15);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3000/mock-hcm/balances/emp1/loc1');
      expect(mockBalanceRepository.save).toHaveBeenCalled();
    });
  });

  describe('requestTimeOff', () => {
    it('should fail if insufficient local balance', async () => {
      mockQueryRunner.manager.findOne.mockImplementation(async (entity) => {
        if (entity.name === 'Employee') return { id: 'emp1' };
        if (entity.name === 'Location') return { id: 'loc1' };
        if (entity.name === 'TimeOffBalance') return { balanceDays: 1 };
      });

      await expect(service.requestTimeOff('emp1', 'loc1', 2)).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should deduct optimistically and create PENDING request', async () => {
      const mockBalance = { employeeId: 'emp1', locationId: 'loc1', balanceDays: 5 };
      mockQueryRunner.manager.findOne.mockImplementation(async (entity) => {
        if (entity.name === 'Employee') return { id: 'emp1' };
        if (entity.name === 'Location') return { id: 'loc1' };
        if (entity.name === 'TimeOffBalance') return mockBalance;
      });
      
      const mockRequest = { id: 'req1', employeeId: 'emp1', daysRequested: 2, status: RequestStatus.PENDING };
      mockQueryRunner.manager.create.mockReturnValue(mockRequest);
      mockQueryRunner.manager.save.mockResolvedValue(mockRequest);

      // Async sync mockup
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      const result = await service.requestTimeOff('emp1', 'loc1', 2);
      
      expect(result.status).toBe(RequestStatus.PENDING);
      expect(mockBalance.balanceDays).toBe(3); // Optimistic deduction
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
