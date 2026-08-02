import { Module } from '@nestjs/common';

import { SuperAdminAcademiesController } from './super-admin-academies.controller';

import { SuperAdminAcademiesService } from './super-admin-academies.service';

@Module({
  controllers: [SuperAdminAcademiesController],

  providers: [SuperAdminAcademiesService],
})
export class SuperAdminAcademiesModule {}
