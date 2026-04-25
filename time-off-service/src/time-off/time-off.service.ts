import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import axios from 'axios';
import { TimeOffBalance } from '../entities/time-off-balance.entity';
import { TimeOffRequest, RequestStatus } from '../entities/time-off-request.entity';
import { Employee } from '../entities/employee.entity';
import { Location } from '../entities/location.entity';

@Injectable()
export class TimeOffService {
  private readonly logger = new Logger(TimeOffService.name);
  private readonly hcmBaseUrl = 'http://localhost:3000/mock-hcm';

  constructor(
    @InjectRepository(TimeOffBalance)
    private balanceRepository: Repository<TimeOffBalance>,
    @InjectRepository(TimeOffRequest)
    private requestRepository: Repository<TimeOffRequest>,
    private dataSource: DataSource,
  ) {}

  private async ensureEmployeeAndLocation(employeeId: string, locationId: string, manager?: any) {
    const mgr = manager || this.dataSource.manager;
    let employee = await mgr.findOne(Employee, { where: { id: employeeId } });
    if (!employee) {
      employee = mgr.create(Employee, { id: employeeId, name: `Employee ${employeeId}`, locationId });
      await mgr.save(employee);
    }
    let location = await mgr.findOne(Location, { where: { id: locationId } });
    if (!location) {
      location = mgr.create(Location, { id: locationId, name: `Location ${locationId}` });
      await mgr.save(location);
    }
  }

  async getBalance(employeeId: string, locationId: string): Promise<number> {
    await this.ensureEmployeeAndLocation(employeeId, locationId);
    let balanceRecord = await this.balanceRepository.findOne({
      where: { employeeId, locationId },
    });

    const isStale = !balanceRecord || (Date.now() - balanceRecord.lastSyncedAt.getTime()) > 60000;

    if (isStale) {
      try {
        const response = await axios.get(`${this.hcmBaseUrl}/balances/${employeeId}/${locationId}`);
        const hcmBalance = response.data.balanceDays;

        if (!balanceRecord) {
          balanceRecord = this.balanceRepository.create({ employeeId, locationId });
        }
        balanceRecord.balanceDays = hcmBalance;
        balanceRecord.lastSyncedAt = new Date();
        await this.balanceRepository.save(balanceRecord);
      } catch (e) {
        this.logger.error('Failed to sync balance with HCM', e.message);
        if (!balanceRecord) throw new BadRequestException('Could not fetch balance');
      }
    }

    return balanceRecord!.balanceDays;
  }

  async requestTimeOff(employeeId: string, locationId: string, daysRequested: number): Promise<TimeOffRequest> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let request: TimeOffRequest;

    try {
      await this.ensureEmployeeAndLocation(employeeId, locationId, queryRunner.manager);

      // 1. Verify local balance first (Defensive approach)
      const balance = await queryRunner.manager.findOne(TimeOffBalance, {
        where: { employeeId, locationId },
      });

      if (!balance || balance.balanceDays < daysRequested) {
        throw new BadRequestException('Insufficient local balance');
      }

      // 2. Optimistically deduct local balance
      balance.balanceDays -= daysRequested;
      await queryRunner.manager.save(balance);

      // 3. Create Pending Request
      request = queryRunner.manager.create(TimeOffRequest, {
        employeeId,
        daysRequested,
        status: RequestStatus.PENDING,
      });
      request = await queryRunner.manager.save(request);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // 4. Attempt to sync with HCM asynchronously
    this.syncRequestWithHcm(request.id, employeeId, locationId, daysRequested).catch((err) => {
        this.logger.error(`HCM Sync failed for request ${request.id}`, err);
    });

    return request;
  }

  private async syncRequestWithHcm(requestId: string, employeeId: string, locationId: string, days: number) {
    let success = false;
    try {
      await axios.post(`${this.hcmBaseUrl}/deduct`, { employeeId, locationId, days });
      success = true;
    } catch (error) {
      this.logger.error(`Failed to deduct balance in HCM: ${error.message}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const request = await queryRunner.manager.findOne(TimeOffRequest, { where: { id: requestId } });
      if (!request) {
        throw new Error(`Request ${requestId} not found during HCM sync`);
      }

      if (success) {
        request.status = RequestStatus.APPROVED;
        await queryRunner.manager.save(request);
      } else {
        // Rollback local deduction
        request.status = RequestStatus.FAILED_SYNC;
        await queryRunner.manager.save(request);

        const balance = await queryRunner.manager.findOne(TimeOffBalance, { where: { employeeId, locationId } });
        if (balance) {
          balance.balanceDays += days;
          await queryRunner.manager.save(balance);
        }
      }
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to update request state after HCM sync', err);
    } finally {
      await queryRunner.release();
    }
  }

  async handleBatchSync(payload: { employeeId: string; locationId: string; balanceDays: number }[]) {
    // In a real scenario, this could be a large batch requiring chunking.
    for (const data of payload) {
      await this.ensureEmployeeAndLocation(data.employeeId, data.locationId);
      
      let balanceRecord = await this.balanceRepository.findOne({
        where: { employeeId: data.employeeId, locationId: data.locationId },
      });

      if (!balanceRecord) {
        balanceRecord = this.balanceRepository.create({
          employeeId: data.employeeId,
          locationId: data.locationId,
        });
      }
      balanceRecord.balanceDays = data.balanceDays;
      balanceRecord.lastSyncedAt = new Date();
      await this.balanceRepository.save(balanceRecord);
    }
  }
}
