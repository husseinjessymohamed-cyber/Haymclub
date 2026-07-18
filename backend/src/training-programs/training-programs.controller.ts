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
import { CreateTrainingProgramDto } from './dto/create-training-program.dto';
import { FindTrainingProgramsQueryDto } from './dto/find-training-programs-query.dto';
import { UpdateTrainingProgramDto } from './dto/update-training-program.dto';
import type { TrainingProgram } from './entities/training-program.entity';
import { TrainingProgramsService } from './training-programs.service';

@Controller('training-programs')
export class TrainingProgramsController {
  constructor(private readonly programsService: TrainingProgramsService) {}

  @Post()
  @Roles(AcademyRole.SUPER_ADMIN, AcademyRole.ACADEMY_ADMIN)
  create(
    @Body()
    dto: CreateTrainingProgramDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    this.assertAcademyAccess(currentUser, dto.academyId);

    return this.programsService.create(dto);
  }

  @Get()
  findAll(
    @Query()
    query: FindTrainingProgramsQueryDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === AcademyRole.SUPER_ADMIN) {
      return this.programsService.findAll(
        query.academyId,
        query.sportId,
        query.isActive,
      );
    }

    if (!currentUser.academyId) {
      return [];
    }

    return this.programsService.findAll(
      currentUser.academyId,
      query.sportId,
      query.isActive,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const program = await this.programsService.findOne(id);

    this.assertProgramAccess(currentUser, program);

    return program;
  }

  @Patch(':id')
  @Roles(AcademyRole.SUPER_ADMIN, AcademyRole.ACADEMY_ADMIN)
  async update(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: UpdateTrainingProgramDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const program = await this.programsService.findOne(id);

    this.assertProgramAccess(currentUser, program);

    return this.programsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(AcademyRole.SUPER_ADMIN, AcademyRole.ACADEMY_ADMIN)
  async remove(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const program = await this.programsService.findOne(id);

    this.assertProgramAccess(currentUser, program);

    return this.programsService.remove(id);
  }

  private assertAcademyAccess(
    currentUser: JwtPayload,
    academyId: string,
  ): void {
    if (
      currentUser.role !== AcademyRole.SUPER_ADMIN &&
      currentUser.academyId !== academyId
    ) {
      throw new ForbiddenException(
        'You cannot manage programs for another academy',
      );
    }
  }

  private assertProgramAccess(
    currentUser: JwtPayload,
    program: TrainingProgram,
  ): void {
    this.assertAcademyAccess(currentUser, program.academyId);
  }
}
