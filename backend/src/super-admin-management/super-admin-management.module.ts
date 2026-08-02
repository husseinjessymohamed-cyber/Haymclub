import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { SuperAdminAuditLog } from './entities/super-admin-audit-log.entity';

import { SupportTicket } from './entities/support-ticket.entity';

import { SystemSetting } from './entities/system-setting.entity';

import { SuperAdminManagementController } from './super-admin-management.controller';

import { SuperAdminManagementService } from './super-admin-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportTicket,
      SuperAdminAuditLog,
      SystemSetting,
    ]),
  ],

  controllers: [SuperAdminManagementController],

  providers: [SuperAdminManagementService],
})
export class SuperAdminManagementModule {}
