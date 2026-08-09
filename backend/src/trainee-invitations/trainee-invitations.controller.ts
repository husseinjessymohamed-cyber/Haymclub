import {
  Controller,
  ForbiddenException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

import {
  Roles,
} from '../auth/decorators/roles.decorator';

import type {
  JwtPayload,
} from '../auth/interfaces/jwt-payload.interface';

import {
  AcademyRole,
} from '../memberships/entities/academy-membership.entity';

import {
  TraineesService,
} from '../trainees/trainees.service';

import {
  TraineeInvitationsService,
} from './trainee-invitations.service';

@Controller(
  'trainee-invitations',
)
export class TraineeInvitationsController {
  constructor(
    private readonly service:
      TraineeInvitationsService,

    private readonly traineesService:
      TraineesService,
  ) {}

  @Post(':traineeId/approve')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
  )
  async approve(
    @Param(
      'traineeId',
      new ParseUUIDPipe(),
    )
    traineeId: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    await this.assertAccess(
      traineeId,
      currentUser,
    );

    return this.service.approve(
      traineeId,
    );
  }

  @Post(':traineeId/reject')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
  )
  async reject(
    @Param(
      'traineeId',
      new ParseUUIDPipe(),
    )
    traineeId: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    await this.assertAccess(
      traineeId,
      currentUser,
    );

    return this.service.reject(
      traineeId,
    );
  }

  @Post(':traineeId/resend')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
  )
  async resend(
    @Param(
      'traineeId',
      new ParseUUIDPipe(),
    )
    traineeId: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    await this.assertAccess(
      traineeId,
      currentUser,
    );

    return this.service.resend(
      traineeId,
    );
  }

  private async assertAccess(
    traineeId: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    const trainee =
      await this.traineesService
        .findOne(
          traineeId,
        );

    if (
      currentUser.role !==
        AcademyRole.SUPER_ADMIN &&
      currentUser.academyId !==
        trainee.academyId
    ) {
      throw new ForbiddenException(
        'لا يمكنك إدارة متدرب تابع لأكاديمية أخرى.',
      );
    }
  }
}
