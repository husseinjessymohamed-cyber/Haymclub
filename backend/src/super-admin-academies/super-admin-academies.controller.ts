import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import {
  SuperAdminAccessGuard,
  SuperAdminJwtGuard,
} from '../super-admin-saas/super-admin-saas.guard';

import { CreateSuperAdminAcademyDto } from './dto/create-super-admin-academy.dto';

import { SuperAdminAcademiesService } from './super-admin-academies.service';

@Controller('super-admin/academies')
@UseGuards(SuperAdminJwtGuard, SuperAdminAccessGuard)
export class SuperAdminAcademiesController {
  constructor(private readonly service: SuperAdminAcademiesService) {}

  @Post()
  createAcademy(
    @Body()
    dto: CreateSuperAdminAcademyDto,
  ) {
    return this.service.createAcademy(dto);
  }
}
