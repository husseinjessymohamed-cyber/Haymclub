import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AcademyRole } from '../memberships/entities/academy-membership.entity';
import { CreateTrainingGroupScheduleDto } from './dto/create-training-group-schedule.dto';
import { CreateTrainingGroupDto } from './dto/create-training-group.dto';
import { FindTrainingGroupsQueryDto } from './dto/find-training-groups-query.dto';
import { UpdateTrainingGroupDto } from './dto/update-training-group.dto';
import type { TrainingGroup } from './entities/training-group.entity';
import { TrainingGroupsService } from './training-groups.service';

@Controller('training-groups')
export class TrainingGroupsController {
  constructor(private readonly groupsService: TrainingGroupsService) {}

  @Post()
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  create(
    @Body()
    dto: CreateTrainingGroupDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    this.assertAcademyAccess(currentUser, dto.academyId);

    this.assertBranchAccess(currentUser, dto.branchId);

    return this.groupsService.create(dto);
  }

  @Get()
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
    AcademyRole.COACH,
  )
  findAll(
    @Query()
    query: FindTrainingGroupsQueryDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === AcademyRole.SUPER_ADMIN) {
      return this.groupsService.findAll(query);
    }

    if (!currentUser.academyId) {
      return [];
    }

    const filters = {
      ...query,
      academyId: currentUser.academyId,
    };

    if (
      currentUser.role === AcademyRole.BRANCH_MANAGER ||
      currentUser.role === AcademyRole.RECEPTIONIST ||
      currentUser.role === AcademyRole.ACCOUNTANT
    ) {
      filters.branchId = currentUser.branchId ?? undefined;
    }

    if (currentUser.role === AcademyRole.COACH) {
      filters.coachId = currentUser.sub;
    }

    return this.groupsService.findAll(filters);
  }

  @Get(':id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
    AcademyRole.COACH,
  )
  async findOne(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const group = await this.groupsService.findOne(id);

    this.assertGroupAccess(currentUser, group);

    return group;
  }

  @Patch(':id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  async update(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: UpdateTrainingGroupDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const group = await this.groupsService.findOne(id);

    this.assertGroupAccess(currentUser, group);

    if (dto.branchId) {
      this.assertBranchAccess(currentUser, dto.branchId);
    }

    return this.groupsService.update(id, dto);
  }

  @Post(':id/schedules')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  async addSchedule(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: CreateTrainingGroupScheduleDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const group = await this.groupsService.findOne(id);

    this.assertGroupAccess(currentUser, group);

    return this.groupsService.addSchedule(id, dto);
  }

  @Delete(':groupId/schedules/:scheduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  async removeSchedule(
    @Param('groupId', new ParseUUIDPipe())
    groupId: string,

    @Param('scheduleId', new ParseUUIDPipe())
    scheduleId: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const group = await this.groupsService.findOne(groupId);

    this.assertGroupAccess(currentUser, group);

    return this.groupsService.removeSchedule(groupId, scheduleId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  async remove(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const group = await this.groupsService.findOne(id);

    this.assertGroupAccess(currentUser, group);

    return this.groupsService.remove(id);
  }

  private assertAcademyAccess(
    currentUser: JwtPayload,
    academyId: string,
  ): void {
    if (
      currentUser.role !== AcademyRole.SUPER_ADMIN &&
      currentUser.academyId !== academyId
    ) {
      throw new ForbiddenException('You cannot access another academy');
    }
  }

  private assertBranchAccess(currentUser: JwtPayload, branchId: string): void {
    if (
      currentUser.role === AcademyRole.BRANCH_MANAGER &&
      currentUser.branchId !== branchId
    ) {
      throw new ForbiddenException('You cannot manage another branch');
    }
  }

  private assertGroupAccess(
    currentUser: JwtPayload,
    group: TrainingGroup,
  ): void {
    this.assertAcademyAccess(currentUser, group.academyId);

    this.assertBranchAccess(currentUser, group.branchId);

    if (
      currentUser.role === AcademyRole.COACH &&
      group.coachId !== currentUser.sub
    ) {
      throw new ForbiddenException('You cannot access another coach group');
    }
  }
}
