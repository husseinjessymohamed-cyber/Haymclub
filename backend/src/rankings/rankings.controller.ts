import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

import {
  Roles,
} from '../auth/decorators/roles.decorator';

import {
  AcademyRole,
} from '../memberships/entities/academy-membership.entity';

import {
  UpdateTraineeRankingDto,
} from './dto/update-trainee-ranking.dto';

import {
  RankingsService,
} from './rankings.service';

const ADMIN_ROLES = [
  AcademyRole.ACADEMY_ADMIN,
  AcademyRole.BRANCH_MANAGER,
  AcademyRole.RECEPTIONIST,
  AcademyRole.COACH,
];

const VIEW_ROLES = [
  ...ADMIN_ROLES,
  AcademyRole.ACCOUNTANT,
  AcademyRole.PARENT,
  AcademyRole.TRAINEE,
];

@Controller('rankings')
export class RankingsController {
  constructor(
    private readonly rankingsService:
      RankingsService,
  ) {}

  @Get('admin')
  @Roles(...ADMIN_ROLES)
  findAdminList(
    @CurrentUser('academyId')
    academyId: string | null,

    @CurrentUser('branchId')
    branchId: string | null,

    @CurrentUser('role')
    role: AcademyRole,
  ) {
    return this.rankingsService
      .findAdminList(
        academyId,
        branchId,
        role,
      );
  }

  @Get('top-ten')
  @Roles(...VIEW_ROLES)
  findTopTen(
    @CurrentUser('academyId')
    academyId: string | null,
  ) {
    return this.rankingsService
      .findTopTen(
        academyId,
      );
  }

  @Put(':traineeId')
  @Roles(...ADMIN_ROLES)
  update(
    @Param(
      'traineeId',
      new ParseUUIDPipe(),
    )
    traineeId: string,

    @CurrentUser('academyId')
    academyId: string | null,

    @CurrentUser('branchId')
    branchId: string | null,

    @CurrentUser('role')
    role: AcademyRole,

    @CurrentUser('sub')
    userId: string,

    @Body()
    dto: UpdateTraineeRankingDto,
  ) {
    return this.rankingsService
      .update(
        traineeId,
        academyId,
        branchId,
        role,
        userId,
        dto,
      );
  }

  @Delete(':traineeId')
  @Roles(...ADMIN_ROLES)
  remove(
    @Param(
      'traineeId',
      new ParseUUIDPipe(),
    )
    traineeId: string,

    @CurrentUser('academyId')
    academyId: string | null,

    @CurrentUser('branchId')
    branchId: string | null,

    @CurrentUser('role')
    role: AcademyRole,
  ) {
    return this.rankingsService
      .remove(
        traineeId,
        academyId,
        branchId,
        role,
      );
  }

}
