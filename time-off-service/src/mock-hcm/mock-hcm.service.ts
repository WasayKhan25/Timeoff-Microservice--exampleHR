import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MockHcmService {
  // Key: employeeId_locationId, Value: balanceDays
  private balances = new Map<string, { employeeId: string; locationId: string; balanceDays: number }>();

  private getKey(employeeId: string, locationId: string): string {
    return `${employeeId}|${locationId}`;
  }

  getBalance(employeeId: string, locationId: string): number {
    const key = this.getKey(employeeId, locationId);
    return this.balances.get(key)?.balanceDays ?? 0;
  }

  setBalance(employeeId: string, locationId: string, balanceDays: number): void {
    const key = this.getKey(employeeId, locationId);
    this.balances.set(key, { employeeId, locationId, balanceDays });
  }

  deductBalance(employeeId: string, locationId: string, days: number): boolean {
    const current = this.getBalance(employeeId, locationId);
    if (current >= days) {
      this.setBalance(employeeId, locationId, current - days);
      return true;
    }
    // Simulate unpredictable HCM behavior: sometimes it fails silently or returns an error
    throw new BadRequestException('Insufficient balance in HCM');
  }

  async triggerBatchSync(webhookUrl: string): Promise<void> {
    const payload = Array.from(this.balances.values());

    try {
      await axios.post(webhookUrl, payload);
    } catch (error) {
      console.error('Failed to send batch sync to webhook', error.message);
    }
  }
}
