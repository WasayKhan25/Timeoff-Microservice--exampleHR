import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TimeOffModule } from './time-off/time-off.module';
import { MockHcmModule } from './mock-hcm/mock-hcm.module';
import { Employee } from './entities/employee.entity';
import { Location } from './entities/location.entity';
import { TimeOffBalance } from './entities/time-off-balance.entity';
import { TimeOffRequest } from './entities/time-off-request.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'time-off.sqlite',
      entities: [Employee, Location, TimeOffBalance, TimeOffRequest],
      synchronize: true, // Use only for development
    }),
    TimeOffModule,
    MockHcmModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
