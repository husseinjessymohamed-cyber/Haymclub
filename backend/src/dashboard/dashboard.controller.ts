import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { AcademyRole } from '../memberships/entities/academy-membership.entity';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

type AuthenticatedRequest = Request & {
  user?: {
    role?: AcademyRole;
    academyId?: string;
    branchId?: string;
  };
};

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  getOverview(
    @Query() query: DashboardQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const user = request.user;

    let academyId = query.academyId;
    let branchId = query.branchId;

    if (user?.role !== AcademyRole.SUPER_ADMIN) {
      academyId = user?.academyId;
    }

    if (user?.role === AcademyRole.BRANCH_MANAGER) {
      branchId = user.branchId;
    }

    if (!academyId) {
      throw new BadRequestException('academyId is required');
    }

    return this.dashboardService.getOverview({
      academyId,
      branchId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }
}
