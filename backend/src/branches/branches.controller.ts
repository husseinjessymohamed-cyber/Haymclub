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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { FindBranchesQueryDto } from './dto/find-branches-query.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Branch } from './entities/branch.entity';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(AcademyRole.SUPER_ADMIN, AcademyRole.ACADEMY_ADMIN)
  create(
    @Body()
    createBranchDto: CreateBranchDto,
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    if (
      currentUser.role !== AcademyRole.SUPER_ADMIN &&
      currentUser.academyId !== createBranchDto.academyId
    ) {
      throw new ForbiddenException(
        'You cannot create a branch for another academy',
      );
    }

    return this.branchesService.create(createBranchDto);
  }

  @Get()
  findAll(
    @Query()
    query: FindBranchesQueryDto,
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === AcademyRole.SUPER_ADMIN) {
      return this.branchesService.findAll(query.academyId);
    }

    if (!currentUser.academyId) {
      return [];
    }

    return this.branchesService.findAll(currentUser.academyId);
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe())
    id: string,
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const branch = await this.branchesService.findOne(id);

    this.assertBranchAccess(currentUser, branch);

    return branch;
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
    updateBranchDto: UpdateBranchDto,
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const branch = await this.branchesService.findOne(id);

    this.assertBranchAccess(currentUser, branch);

    return this.branchesService.update(id, updateBranchDto);
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
    const branch = await this.branchesService.findOne(id);

    this.assertBranchAccess(currentUser, branch);

    return this.branchesService.remove(id);
  }

  private assertBranchAccess(currentUser: JwtPayload, branch: Branch): void {
    if (currentUser.role === AcademyRole.SUPER_ADMIN) {
      return;
    }

    if (!currentUser.academyId || currentUser.academyId !== branch.academyId) {
      throw new ForbiddenException('You cannot access another academy branch');
    }

    if (
      currentUser.role === AcademyRole.BRANCH_MANAGER &&
      currentUser.branchId !== branch.id
    ) {
      throw new ForbiddenException('You cannot manage another branch');
    }
  }
}
