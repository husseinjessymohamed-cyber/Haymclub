import {
  Module,
} from '@nestjs/common';

import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  AttendanceModule,
} from '../attendance/attendance.module';

import {
  BillingModule,
} from '../billing/billing.module';

import {
  TraineesModule,
} from '../trainees/trainees.module';

import {
  UsersModule,
} from '../users/users.module';

import {
  PortalTraineeLink,
} from './entities/portal-trainee-link.entity';

import {
  PortalController,
} from './portal.controller';

import {
  PortalService,
} from './portal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PortalTraineeLink,
    ]),

    UsersModule,
    TraineesModule,
    AttendanceModule,
    BillingModule,
  ],

  controllers: [
    PortalController,
  ],

  providers: [
    PortalService,
  ],

  exports: [
    PortalService,
  ],
})
export class PortalModule {}
