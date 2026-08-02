import { Module } from '@nestjs/common';

import {
  PasswordResetModule,
} from '../password-reset/password-reset.module';

import { SuperAdminAcademyManagementController } from './super-admin-academy-management.controller';

import { SuperAdminAcademyManagementService } from './super-admin-academy-management.service';

@Module({
  imports: [
    PasswordResetModule,
  ],

  controllers: [SuperAdminAcademyManagementController],

  providers: [SuperAdminAcademyManagementService],
})
export class SuperAdminAcademyManagementModule {}
