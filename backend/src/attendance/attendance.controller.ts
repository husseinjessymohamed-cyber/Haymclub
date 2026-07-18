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
import type { Trainee } from '../trainees/entities/trainee.entity';
import { TraineesService } from '../trainees/trainees.service';
import type { TrainingGroup } from '../training-groups/entities/training-group.entity';
import { TrainingGroupsService } from '../training-groups/training-groups.service';
import { AttendanceService } from './attendance.service';
import { CreateTrainingSessionDto } from './dto/create-training-session.dto';
import { FindTrainingSessionsQueryDto } from './dto/find-training-sessions-query.dto';
import { BulkMarkAttendanceDto } from './dto/mark-attendance.dto';
import { UpdateTrainingSessionDto } from './dto/update-training-session.dto';
import type { TrainingSession } from './entities/training-session.entity';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,

    private readonly trainingGroupsService: TrainingGroupsService,

    private readonly traineesService: TraineesService,
  ) {}

  @Post('sessions')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.COACH,
  )
  async createSession(
    @Body()
    dto: CreateTrainingSessionDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const group = await this.trainingGroupsService.findOne(dto.groupId);

    this.assertGroupAccess(currentUser, group);

    if (dto.academyId !== group.academyId) {
      throw new ForbiddenException('Invalid academy for this group');
    }

    if (dto.branchId !== group.branchId) {
      throw new ForbiddenException('Invalid branch for this group');
    }

    if (
      currentUser.role === AcademyRole.COACH &&
      dto.coachId &&
      dto.coachId !== currentUser.sub
    ) {
      throw new ForbiddenException('A coach cannot assign another coach');
    }

    return this.attendanceService.createSession(dto);
  }

  @Get('sessions')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
    AcademyRole.COACH,
  )
  findSessions(
    @Query()
    query: FindTrainingSessionsQueryDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === AcademyRole.SUPER_ADMIN) {
      return this.attendanceService.findSessions(query);
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

    return this.attendanceService.findSessions(filters);
  }

  @Get('sessions/:id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
    AcademyRole.COACH,
  )
  async findSession(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const session = await this.attendanceService.findSession(id);

    this.assertSessionAccess(currentUser, session);

    return session;
  }

  @Patch('sessions/:id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.COACH,
  )
  async updateSession(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: UpdateTrainingSessionDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const session = await this.attendanceService.findSession(id);

    this.assertSessionAccess(currentUser, session);

    if (
      currentUser.role === AcademyRole.COACH &&
      dto.coachId !== undefined &&
      dto.coachId !== currentUser.sub
    ) {
      throw new ForbiddenException('A coach cannot assign another coach');
    }

    return this.attendanceService.updateSession(id, dto);
  }

  @Post('sessions/:id/records')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.COACH,
  )
  async markAttendance(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: BulkMarkAttendanceDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const session = await this.attendanceService.findSession(id);

    this.assertSessionAccess(currentUser, session);

    return this.attendanceService.markAttendance(id, dto.records);
  }

  @Get('trainees/:traineeId/stats')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
    AcademyRole.COACH,
  )
  async getTraineeStats(
    @Param('traineeId', new ParseUUIDPipe())
    traineeId: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const trainee = await this.traineesService.findOne(traineeId);

    this.assertTraineeAccess(currentUser, trainee);

    return this.attendanceService.getTraineeStats(traineeId);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  async removeSession(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const session = await this.attendanceService.findSession(id);

    this.assertSessionAccess(currentUser, session);

    return this.attendanceService.removeSession(id);
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
      (currentUser.role === AcademyRole.BRANCH_MANAGER ||
        currentUser.role === AcademyRole.RECEPTIONIST ||
        currentUser.role === AcademyRole.ACCOUNTANT) &&
      currentUser.branchId !== branchId
    ) {
      throw new ForbiddenException('You cannot access another branch');
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

  private assertSessionAccess(
    currentUser: JwtPayload,
    session: TrainingSession,
  ): void {
    this.assertAcademyAccess(currentUser, session.academyId);

    this.assertBranchAccess(currentUser, session.branchId);

    if (
      currentUser.role === AcademyRole.COACH &&
      session.coachId !== currentUser.sub
    ) {
      throw new ForbiddenException('You cannot access another coach session');
    }
  }

  private assertTraineeAccess(currentUser: JwtPayload, trainee: Trainee): void {
    this.assertAcademyAccess(currentUser, trainee.academyId);

    this.assertBranchAccess(currentUser, trainee.branchId);

    if (currentUser.role === AcademyRole.COACH) {
      const belongsToCoach = trainee.enrollments.some(
        (enrollment) => enrollment.group.coachId === currentUser.sub,
      );

      if (!belongsToCoach) {
        throw new ForbiddenException(
          'You cannot access a trainee outside your groups',
        );
      }
    }
  }
}
