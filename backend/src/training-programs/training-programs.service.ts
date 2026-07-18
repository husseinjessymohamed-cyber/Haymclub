import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';

import { AcademiesService } from '../academies/academies.service';
import { SportsService } from '../sports/sports.service';
import { CreateTrainingProgramDto } from './dto/create-training-program.dto';
import { UpdateTrainingProgramDto } from './dto/update-training-program.dto';
import {
  TrainingLevel,
  TrainingProgram,
} from './entities/training-program.entity';

@Injectable()
export class TrainingProgramsService {
  constructor(
    @InjectRepository(TrainingProgram)
    private readonly programsRepository: Repository<TrainingProgram>,

    private readonly academiesService: AcademiesService,

    private readonly sportsService: SportsService,
  ) {}

  async create(dto: CreateTrainingProgramDto): Promise<TrainingProgram> {
    await this.academiesService.findOne(dto.academyId);

    const sport = await this.sportsService.findOne(dto.sportId);

    if (sport.academyId !== dto.academyId) {
      throw new BadRequestException(
        'Sport does not belong to the selected academy',
      );
    }

    this.validateAgeRange(dto.minimumAge, dto.maximumAge);

    const program = this.programsRepository.create({
      academyId: dto.academyId,
      sportId: dto.sportId,
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      description: dto.description?.trim() || null,
      level: dto.level ?? TrainingLevel.ALL_LEVELS,
      minimumAge: dto.minimumAge ?? null,
      maximumAge: dto.maximumAge ?? null,
      sessionsPerWeek: dto.sessionsPerWeek ?? 2,
      sessionDurationMinutes: dto.sessionDurationMinutes ?? 60,
      capacity: dto.capacity ?? null,
      isActive: dto.isActive ?? true,
    });

    try {
      return await this.programsRepository.save(program);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  findAll(
    academyId?: string,
    sportId?: string,
    isActive?: boolean,
  ): Promise<TrainingProgram[]> {
    const where: FindOptionsWhere<TrainingProgram> = {};

    if (academyId) {
      where.academyId = academyId;
    }

    if (sportId) {
      where.sportId = sportId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.programsRepository.find({
      where,
      relations: {
        sport: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<TrainingProgram> {
    const program = await this.programsRepository.findOne({
      where: {
        id,
      },
      relations: {
        sport: true,
      },
    });

    if (!program) {
      throw new NotFoundException('Training program not found');
    }

    return program;
  }

  async update(
    id: string,
    dto: UpdateTrainingProgramDto,
  ): Promise<TrainingProgram> {
    const existingProgram = await this.findOne(id);

    const minimumAge = dto.minimumAge ?? existingProgram.minimumAge;

    const maximumAge = dto.maximumAge ?? existingProgram.maximumAge;

    this.validateAgeRange(minimumAge, maximumAge);

    const program = this.programsRepository.merge(existingProgram, {
      ...dto,
      name: dto.name ? dto.name.trim() : existingProgram.name,

      code: dto.code ? dto.code.trim().toUpperCase() : existingProgram.code,

      description:
        dto.description !== undefined
          ? dto.description.trim() || null
          : existingProgram.description,

      minimumAge,
      maximumAge,
    });

    try {
      return await this.programsRepository.save(program);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const program = await this.findOne(id);

    await this.programsRepository.softRemove(program);
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
        'A training program with the same code already exists in this academy',
      );
    }

    if (error instanceof QueryFailedError && postgresCode === '23503') {
      throw new NotFoundException('Academy or sport not found');
    }

    throw error;
  }
}
