import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AcademyRole } from '../memberships/entities/academy-membership.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
  )
  create(
    @Body()
    createUserDto: CreateUserDto,
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    this.assertCanCreateUser(currentUser, createUserDto);

    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
    AcademyRole.COACH,
  )
  findAll(
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === AcademyRole.SUPER_ADMIN) {
      return this.usersService.findAll();
    }

    if (!currentUser.academyId) {
      return [];
    }

    return this.usersService.findAllByAcademyId(currentUser.academyId);
  }

  @Get(':id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
    AcademyRole.COACH,
  )
  async findOne(
    @Param('id', new ParseUUIDPipe())
    id: string,
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const profile = await this.usersService.findProfileById(id);

    if (currentUser.role !== AcademyRole.SUPER_ADMIN) {
      const belongsToAcademy = profile.memberships.some(
        (membership) => membership.academyId === currentUser.academyId,
      );

      if (!belongsToAcademy) {
        throw new ForbiddenException(
          'You cannot access a user from another academy',
        );
      }
    }

    return profile;
  }

  private assertCanCreateUser(
    currentUser: JwtPayload,
    createUserDto: CreateUserDto,
  ): void {
    if (currentUser.role === AcademyRole.SUPER_ADMIN) {
      return;
    }

    if (
      !currentUser.academyId ||
      currentUser.academyId !== createUserDto.academyId
    ) {
      throw new ForbiddenException(
        'You cannot create a user for another academy',
      );
    }

    if (createUserDto.role === AcademyRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only a super admin can create another super admin',
      );
    }

    if (currentUser.role === AcademyRole.BRANCH_MANAGER) {
      const allowedRoles = [
        AcademyRole.RECEPTIONIST,
        AcademyRole.ACCOUNTANT,
        AcademyRole.COACH,
        AcademyRole.PARENT,
        AcademyRole.TRAINEE,
      ];

      if (!allowedRoles.includes(createUserDto.role)) {
        throw new ForbiddenException(
          'A branch manager cannot create this role',
        );
      }

      if (
        !currentUser.branchId ||
        currentUser.branchId !== createUserDto.branchId
      ) {
        throw new ForbiddenException(
          'A branch manager can only create users in their branch',
        );
      }
    }
  }
}
