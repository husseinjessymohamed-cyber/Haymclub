import {
  ForbiddenException,
  Body,
  Controller,
  Delete,
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

import { CreatePortalLinkDto } from './dto/create-portal-link.dto';

import { CreateTraineePortalAccountDto } from './dto/create-trainee-portal-account.dto';

import { FindPortalLinksQueryDto } from './dto/find-portal-links-query.dto';

import { UpdatePortalLinkDto } from './dto/update-portal-link.dto';

import { PortalService } from './portal.service';

import { DataSource } from 'typeorm';

@Controller('portal')
export class PortalController {
  constructor(
    private readonly portalService: PortalService,

    private readonly dataSource: DataSource,
  ) {}

  @Get('me')
  @Roles(AcademyRole.PARENT, AcademyRole.TRAINEE)
  getMyPortal(
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    return this.portalService.getMyPortal(currentUser);
  }

  // HAYMCLUB_CLIENT_TRAINING_SCHEDULE
  @Get('trainees/:traineeId/schedule')
  @Roles(AcademyRole.PARENT, AcademyRole.TRAINEE)
  async getTraineeTrainingSchedule(
    @Param('traineeId', new ParseUUIDPipe())
    traineeId: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const linkRows = (await this.dataSource.query(
      `
          SELECT
            id
          FROM portal_trainee_links
          WHERE user_id = $1
            AND trainee_id = $2
            AND is_active = TRUE
            AND deleted_at IS NULL
          LIMIT 1
        `,
      [currentUser.sub, traineeId],
    )) as Array<{
      id: string;
    }>;

    if (linkRows.length === 0) {
      throw new ForbiddenException('لا يمكنك مشاهدة جدول هذا المتدرب.');
    }

    return this.dataSource.query(
      `
        SELECT DISTINCT
          session.id
            AS "id",

          session.session_date
            AS "sessionDate",

          session.start_time
            AS "startTime",

          session.end_time
            AS "endTime",

          session.venue_name
            AS "venueName",

          session.notes
            AS "notes",

          session.status::text
            AS "status",

          session.is_active
            AS "isActive",

          training_group.id
            AS "groupId",

          training_group.name
            AS "groupName",

          branch.id
            AS "branchId",

          branch.name
            AS "branchName",

          CONCAT_WS(
            ' ',
            coach.first_name,
            coach.last_name
          ) AS "coachName",

          program.name
            AS "programName",

          sport.name
            AS "sportName",

          CASE
            WHEN session.session_date >=
              CURRENT_DATE
            THEN 0
            ELSE 1
          END AS "scheduleOrder"

        FROM training_sessions
          AS session

        INNER JOIN group_enrollments
          AS enrollment
          ON enrollment.group_id =
            session.group_id
          AND enrollment.trainee_id = $1
          AND enrollment.deleted_at IS NULL
          AND enrollment.status::text =
            'ACTIVE'

        LEFT JOIN training_groups
          AS training_group
          ON training_group.id =
            session.group_id

        LEFT JOIN branches
          AS branch
          ON branch.id =
            session.branch_id

        LEFT JOIN users
          AS coach
          ON coach.id =
            session.coach_id

        LEFT JOIN training_programs
          AS program
          ON program.id =
            training_group.program_id

        LEFT JOIN sports
          AS sport
          ON sport.id =
            program.sport_id

        WHERE session.deleted_at IS NULL
          AND session.is_active = TRUE

        ORDER BY
          "scheduleOrder" ASC,
          session.session_date ASC,
          session.start_time ASC

        LIMIT 100
      `,
      [traineeId],
    );
  }

  @Post('trainee-links')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  createTraineeAccountLink(
    @Body()
    dto: CreateTraineePortalAccountDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    return this.portalService.createTraineeAccountLink(dto, currentUser);
  }

  @Post('links')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  createLink(
    @Body()
    dto: CreatePortalLinkDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    return this.portalService.createLink(dto, currentUser);
  }

  @Get('links')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  findLinks(
    @Query()
    query: FindPortalLinksQueryDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    return this.portalService.findLinks(query, currentUser);
  }

  @Get('links/:id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  findLink(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    return this.portalService.findLink(id, currentUser);
  }

  @Patch('links/:id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  updateLink(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: UpdatePortalLinkDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    return this.portalService.updateLink(id, dto, currentUser);
  }

  @Delete('links/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  removeLink(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    return this.portalService.removeLink(id, currentUser);
  }
}
