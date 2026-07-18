import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';

import { AcademiesService } from '../academies/academies.service';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { Sport } from './entities/sport.entity';

@Injectable()
export class SportsService {
  constructor(
    @InjectRepository(Sport)
    private readonly sportsRepository: Repository<Sport>,

    private readonly academiesService: AcademiesService,
  ) {}

  async create(createSportDto: CreateSportDto): Promise<Sport> {
    await this.academiesService.findOne(createSportDto.academyId);

    this.validateAgeRange(createSportDto.minimumAge, createSportDto.maximumAge);

    const sport = this.sportsRepository.create({
      ...createSportDto,
      name: createSportDto.name.trim(),
      code: createSportDto.code.trim().toUpperCase(),
      description: createSportDto.description?.trim() || null,
      minimumAge: createSportDto.minimumAge ?? null,
      maximumAge: createSportDto.maximumAge ?? null,
    });

    try {
      return await this.sportsRepository.save(sport);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  findAll(academyId?: string, isActive?: boolean): Promise<Sport[]> {
    const where: FindOptionsWhere<Sport> = {};

    if (academyId) {
      where.academyId = academyId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.sportsRepository.find({
      where,
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Sport> {
    const sport = await this.sportsRepository.findOne({
      where: {
        id,
      },
    });

    if (!sport) {
      throw new NotFoundException('Sport not found');
    }

    return sport;
  }

  async update(id: string, updateSportDto: UpdateSportDto): Promise<Sport> {
    const existingSport = await this.findOne(id);

    const minimumAge = updateSportDto.minimumAge ?? existingSport.minimumAge;

    const maximumAge = updateSportDto.maximumAge ?? existingSport.maximumAge;

    this.validateAgeRange(minimumAge, maximumAge);

    const sport = this.sportsRepository.merge(existingSport, {
      ...updateSportDto,
      name: updateSportDto.name
        ? updateSportDto.name.trim()
        : existingSport.name,
      code: updateSportDto.code
        ? updateSportDto.code.trim().toUpperCase()
        : existingSport.code,
      description:
        updateSportDto.description !== undefined
          ? updateSportDto.description.trim() || null
          : existingSport.description,
      minimumAge,
      maximumAge,
    });

    try {
      return await this.sportsRepository.save(sport);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const sport = await this.findOne(id);

    await this.sportsRepository.softRemove(sport);
  }

  private validateAgeRange(
    minimumAge?: number | null,
    maximumAge?: number | null,
  ): void {
    if (
      minimumAge !== null &&
      minimumAge !== undefined &&
      maximumAge !== null &&
      maximumAge !== undefined &&
      minimumAge > maximumAge
    ) {
      throw new BadRequestException(
        'minimumAge cannot be greater than maximumAge',
      );
    }
  }

  private handleDatabaseError(error: unknown): never {
    const postgresCode = (
      error as {
        driverError?: {
          code?: string;
        };
      }
    )?.driverError?.code;

    if (error instanceof QueryFailedError && postgresCode === '23505') {
      throw new ConflictException(
        'A sport with the same code already exists in this academy',
      );
    }

    if (error instanceof QueryFailedError && postgresCode === '23503') {
      throw new NotFoundException('Academy not found');
    }

    throw error;
  }
}
