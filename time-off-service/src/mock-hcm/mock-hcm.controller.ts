import { Controller, Get, Param, Post, Body, HttpCode } from '@nestjs/common';
import { MockHcmService } from './mock-hcm.service';

@Controller('mock-hcm')
export class MockHcmController {
  constructor(private readonly mockHcmService: MockHcmService) {}

  @Get('balances/:employeeId/:locationId')
  getBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
  ) {
    const balance = this.mockHcmService.getBalance(employeeId, locationId);
    return { employeeId, locationId, balanceDays: balance };
  }

  @Post('set-balance')
  setBalance(@Body() body: { employeeId: string; locationId: string; balanceDays: number }) {
    this.mockHcmService.setBalance(body.employeeId, body.locationId, body.balanceDays);
    return { success: true, ...body };
  }

  @Post('deduct')
  @HttpCode(200)
  deductBalance(@Body() body: { employeeId: string; locationId: string; days: number }) {
    // This will throw a 400 exception if insufficient, simulating an HCM error
    this.mockHcmService.deductBalance(body.employeeId, body.locationId, body.days);
    return { success: true };
  }

  @Post('trigger-batch')
  @HttpCode(200)
  async triggerBatch(@Body() body: { webhookUrl: string }) {
    await this.mockHcmService.triggerBatchSync(body.webhookUrl);
    return { success: true, message: 'Batch sync triggered' };
  }
}
