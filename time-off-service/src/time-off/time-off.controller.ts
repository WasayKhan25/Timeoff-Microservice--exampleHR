import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TimeOffService } from './time-off.service';

@Controller('time-off')
export class TimeOffController {
  constructor(private readonly timeOffService: TimeOffService) {}

  @Get('balances/:employeeId/:locationId')
  async getBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
  ) {
    const balance = await this.timeOffService.getBalance(employeeId, locationId);
    return { employeeId, locationId, balanceDays: balance };
  }

  @Post('requests')
  async createRequest(
    @Body() body: { employeeId: string; locationId: string; daysRequested: number }
  ) {
    const request = await this.timeOffService.requestTimeOff(body.employeeId, body.locationId, body.daysRequested);
    return {
      message: 'Time-off request created',
      request,
    };
  }

  @Post('webhooks/hcm/batch-sync')
  async hcmBatchSync(@Body() payload: { employeeId: string; locationId: string; balanceDays: number }[]) {
    await this.timeOffService.handleBatchSync(payload);
    return { success: true, processed: payload.length };
  }
}
