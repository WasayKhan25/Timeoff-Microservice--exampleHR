import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeOffController } from './time-off.controller';
import { TimeOffService } from './time-off.service';
import { Employee } from '../entities/employee.entity';
import { Location } from '../entities/location.entity';
import { TimeOffBalance } from '../entities/time-off-balance.entity';
import { TimeOffRequest } from '../entities/time-off-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Location, TimeOffBalance, TimeOffRequest])],
  controllers: [TimeOffController],
  providers: [TimeOffService]
})
export class TimeOffModule {}
