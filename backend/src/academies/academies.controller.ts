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
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AcademyRole } from '../memberships/entities/academy-membership.entity';
import { AcademiesService } from './academies.service';
import { CreateAcademyDto } from './dto/create-academy.dto';
import { UpdateAcademyDto } from './dto/update-academy.dto';

@Controller('academies')
export class AcademiesController {
  constructor(private readonly academiesService: AcademiesService) {}

  @Post()
  @Roles(AcademyRole.SUPER_ADMIN)
  create(
    @Body()
    createAcademyDto: CreateAcademyDto,
  ) {
    return this.academiesService.create(createAcademyDto);
  }

  @Get()
  async findAll(
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === AcademyRole.SUPER_ADMIN) {
      return this.academiesService.findAll();
    }

    if (!currentUser.academyId) {
      return [];
    }

    const academy = await this.academiesService.findOne(currentUser.academyId);

    return [academy];
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe())
    id: string,
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    this.assertAcademyAccess(currentUser, id);

    return this.academiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(AcademyRole.SUPER_ADMIN, AcademyRole.ACADEMY_ADMIN)
  update(
    @Param('id', new ParseUUIDPipe())
    id: string,
    @Body()
    updateAcademyDto: UpdateAcademyDto,
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    this.assertAcademyAccess(currentUser, id);

    return this.academiesService.update(id, updateAcademyDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(AcademyRole.SUPER_ADMIN)
  remove(
    @Param('id', new ParseUUIDPipe())
    id: string,
  ) {
    return this.academiesService.remove(id);
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
}
