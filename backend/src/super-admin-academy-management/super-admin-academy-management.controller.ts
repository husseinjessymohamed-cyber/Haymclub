import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  SuperAdminAccessGuard,
  SuperAdminJwtGuard,
} from '../super-admin-saas/super-admin-saas.guard';

import { CreateAcademyManagerDto } from './dto/create-academy-manager.dto';

import { CreateMainBranchDto } from './dto/create-main-branch.dto';

import { UpdateSuperAdminAcademyStatusDto } from './dto/update-academy-status.dto';

import { UpdateSuperAdminAcademyDto } from './dto/update-academy.dto';

import {
  PasswordResetService,
} from '../password-reset/password-reset.service';

import { SuperAdminAcademyManagementService } from './super-admin-academy-management.service';

@Controller('super-admin/academies')
@UseGuards(SuperAdminJwtGuard, SuperAdminAccessGuard)
export class SuperAdminAcademyManagementController {
  constructor(
    private readonly service:
      SuperAdminAcademyManagementService,

    private readonly passwordResetService:
      PasswordResetService,
  ) {}

  @Get(':id')
  getDetails(
    @Param('id', new ParseUUIDPipe())
    id: string,
  ) {
    return this.service.getDetails(id);
  }

  @Patch(':id')
  updateAcademy(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: UpdateSuperAdminAcademyDto,
  ) {
    return this.service.updateAcademy(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: UpdateSuperAdminAcademyStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }

  @Post(':id/main-branch')
  ensureMainBranch(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: CreateMainBranchDto,
  ) {
    return this.service.ensureMainBranch(id, dto);
  }

  @Post(':id/manager')
  async createManager(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: CreateAcademyManagerDto,
  ) {
    const result =
      await this.service.createManager(
        id,
        dto,
      );

    await this.passwordResetService
      .forgotPassword({
        email:
          dto.email
            .trim()
            .toLowerCase(),
      });

    return result;
  }
}
