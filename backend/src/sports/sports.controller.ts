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
import { CreateSportDto } from './dto/create-sport.dto';
import { FindSportsQueryDto } from './dto/find-sports-query.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { Sport } from './entities/sport.entity';
import { SportsService } from './sports.service';

@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Post()
  @Roles(AcademyRole.SUPER_ADMIN, AcademyRole.ACADEMY_ADMIN)
  create(
    @Body()
    createSportDto: CreateSportDto,
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    this.assertAcademyAccess(currentUser, createSportDto.academyId);

    return this.sportsService.create(createSportDto);
  }

  @Get()
  findAll(
    @Query()
    query: FindSportsQueryDto,
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === AcademyRole.SUPER_ADMIN) {
      return this.sportsService.findAll(query.academyId, query.isActive);
    }

    if (!currentUser.academyId) {
      return [];
    }

    return this.sportsService.findAll(currentUser.academyId, query.isActive);
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe())
    id: string,
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const sport = await this.sportsService.findOne(id);

    this.assertSportAccess(currentUser, sport);

    return sport;
  }

  @Patch(':id')
  @Roles(AcademyRole.SUPER_ADMIN, AcademyRole.ACADEMY_ADMIN)
  async update(
    @Param('id', new ParseUUIDPipe())
    id: string,
    @Body()
    updateSportDto: UpdateSportDto,
    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const sport = await this.sportsService.findOne(id);

    this.assertSportAccess(currentUser, sport);

    return this.sportsService.update(id, updateSportDto);
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
    const sport = await this.sportsService.findOne(id);

    this.assertSportAccess(currentUser, sport);

    return this.sportsService.remove(id);
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
        'You cannot manage sports for another academy',
      );
    }
  }

  private assertSportAccess(currentUser: JwtPayload, sport: Sport): void {
    this.assertAcademyAccess(currentUser, sport.academyId);
  }
}
