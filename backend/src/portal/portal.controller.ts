import {
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
  CreatePortalLinkDto,
} from './dto/create-portal-link.dto';

import {
  CreateTraineePortalAccountDto,
} from './dto/create-trainee-portal-account.dto';


import {
  FindPortalLinksQueryDto,
} from './dto/find-portal-links-query.dto';

import {
  UpdatePortalLinkDto,
} from './dto/update-portal-link.dto';

import {
  PortalService,
} from './portal.service';

@Controller('portal')
export class PortalController {
  constructor(
    private readonly portalService:
      PortalService,
  ) {}

  @Get('me')
  @Roles(
    AcademyRole.PARENT,
    AcademyRole.TRAINEE,
  )
  getMyPortal(
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    return this.portalService
      .getMyPortal(currentUser);
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
    return this.portalService
      .createTraineeAccountLink(
        dto,
        currentUser,
      );
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
    return this.portalService
      .createLink(
        dto,
        currentUser,
      );
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
    return this.portalService
      .findLinks(
        query,
        currentUser,
      );
  }

  @Get('links/:id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  findLink(
    @Param(
      'id',
      new ParseUUIDPipe(),
    )
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    return this.portalService
      .findLink(
        id,
        currentUser,
      );
  }

  @Patch('links/:id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  updateLink(
    @Param(
      'id',
      new ParseUUIDPipe(),
    )
    id: string,

    @Body()
    dto: UpdatePortalLinkDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    return this.portalService
      .updateLink(
        id,
        dto,
        currentUser,
      );
  }

  @Delete('links/:id')
  @HttpCode(
    HttpStatus.NO_CONTENT,
  )
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  removeLink(
    @Param(
      'id',
      new ParseUUIDPipe(),
    )
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    return this.portalService
      .removeLink(
        id,
        currentUser,
      );
  }
}
