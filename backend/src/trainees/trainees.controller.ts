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
import { AddGuardianDto } from './dto/add-guardian.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateTraineeDto } from './dto/create-trainee.dto';
import { FindTraineesQueryDto } from './dto/find-trainees-query.dto';
import { UpdateTraineeDto } from './dto/update-trainee.dto';
import type { Trainee } from './entities/trainee.entity';
import { TraineesService } from './trainees.service';

@Controller('trainees')
export class TraineesController {
  constructor(private readonly traineesService: TraineesService) {}

  @Post()
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
  )
  create(
    @Body()
    dto: CreateTraineeDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    this.assertAcademyAccess(currentUser, dto.academyId);

    this.assertBranchAccess(currentUser, dto.branchId);

    return this.traineesService.create(dto);
  }

  @Get()
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
  )
  findAll(
    @Query()
    query: FindTraineesQueryDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === AcademyRole.SUPER_ADMIN) {
      return this.traineesService.findAll(query);
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

    return this.traineesService.findAll(filters);
  }

  @Get(':id/enrollments')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
  )
  async findEnrollments(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const trainee = await this.traineesService.findOne(id);

    this.assertTraineeAccess(currentUser, trainee);

    return this.traineesService.findEnrollments(id);
  }

  @Get(':id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
  )
  async findOne(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const trainee = await this.traineesService.findOne(id);

    this.assertTraineeAccess(currentUser, trainee);

    return trainee;
  }

  @Patch(':id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
  )
  async update(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: UpdateTraineeDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const trainee = await this.traineesService.findOne(id);

    this.assertTraineeAccess(currentUser, trainee);

    if (dto.branchId) {
      this.assertBranchAccess(currentUser, dto.branchId);
    }

    return this.traineesService.update(id, dto);
  }

  @Post(':id/guardians')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
  )
  async addGuardian(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: AddGuardianDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const trainee = await this.traineesService.findOne(id);

    this.assertTraineeAccess(currentUser, trainee);

    return this.traineesService.addGuardian(id, dto);
  }

  @Post(':id/enrollments')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
  )
  async enroll(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: CreateEnrollmentDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const trainee = await this.traineesService.findOne(id);

    this.assertTraineeAccess(currentUser, trainee);

    return this.traineesService.enroll(id, dto);
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
    const trainee = await this.traineesService.findOne(id);

    this.assertTraineeAccess(currentUser, trainee);

    return this.traineesService.remove(id);
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

  private assertTraineeAccess(currentUser: JwtPayload, trainee: Trainee): void {
    this.assertAcademyAccess(currentUser, trainee.academyId);

    this.assertBranchAccess(currentUser, trainee.branchId);
  }
}
