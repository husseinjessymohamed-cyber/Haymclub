import { Controller, Get } from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';

import { AcademyRole } from '../memberships/entities/academy-membership.entity';

import { SuperAdminService } from './super-admin.service';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('dashboard')
  @Roles(AcademyRole.SUPER_ADMIN)
  getDashboard() {
    return this.superAdminService.getDashboard();
  }

  @Get('academies')
  @Roles(AcademyRole.SUPER_ADMIN)
  getAcademies() {
    return this.superAdminService.getAcademies();
  }
}
