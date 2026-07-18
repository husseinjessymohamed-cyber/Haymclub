import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';

import { BranchesService } from '../branches/branches.service';
import { AcademyRole } from '../memberships/entities/academy-membership.entity';
import { TrainingProgramsService } from '../training-programs/training-programs.service';
import { UsersService } from '../users/users.service';
import { CreateTrainingGroupScheduleDto } from './dto/create-training-group-schedule.dto';
import { CreateTrainingGroupDto } from './dto/create-training-group.dto';
import { UpdateTrainingGroupDto } from './dto/update-training-group.dto';
import { TrainingGroupSchedule } from './entities/training-group-schedule.entity';
import {
  TrainingGroup,
  TrainingGroupStatus,
} from './entities/training-group.entity';

export interface TrainingGroupFilters {
  academyId?: string;
  branchId?: string;
  programId?: string;
  coachId?: string;
  status?: TrainingGroupStatus;
  isActive?: boolean;
}

@Injectable()
export class TrainingGroupsService {
  constructor(
    @InjectRepository(TrainingGroup)
    private readonly groupsRepository: Repository<TrainingGroup>,

    @InjectRepository(TrainingGroupSchedule)
    private readonly schedulesRepository: Repository<TrainingGroupSchedule>,

    private readonly dataSource: DataSource,
    private readonly branchesService: BranchesService,
    private readonly programsService: TrainingProgramsService,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateTrainingGroupDto): Promise<TrainingGroup> {
    await this.validateReferences(
      dto.academyId,
      dto.branchId,
      dto.programId,
      dto.coachId,
    );

    this.validateSchedules(dto.schedules ?? []);

    try {
      const groupId = await this.dataSource.transaction(async (manager) => {
        const groupsRepository = manager.getRepository(TrainingGroup);

        const schedulesRepository = manager.getRepository(
          TrainingGroupSchedule,
        );

        const group = groupsRepository.create({
          academyId: dto.academyId,
          branchId: dto.branchId,
          programId: dto.programId,
          coachId: dto.coachId ?? null,
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          capacity: dto.capacity ?? 20,
          status: dto.status ?? TrainingGroupStatus.ACTIVE,
          notes: dto.notes?.trim() || null,
          isActive: dto.isActive ?? true,
        });

        const savedGroup = await groupsRepository.save(group);

        if (dto.schedules && dto.schedules.length > 0) {
          const schedules = dto.schedules.map((schedule) =>
            schedulesRepository.create({
              groupId: savedGroup.id,
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              venueName: schedule.venueName?.trim() || null,
              isActive: schedule.isActive ?? true,
            }),
          );

          await schedulesRepository.save(schedules);
        }

        return savedGroup.id;
      });

      return await this.findOne(groupId);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  findAll(filters: TrainingGroupFilters): Promise<TrainingGroup[]> {
    const where: FindOptionsWhere<TrainingGroup> = {};

    if (filters.academyId) {
      where.academyId = filters.academyId;
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.programId) {
      where.programId = filters.programId;
    }

    if (filters.coachId) {
      where.coachId = filters.coachId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.groupsRepository.find({
      where,
      relations: {
        branch: true,
        coach: true,
        program: {
          sport: true,
        },
        schedules: true,
      },
      order: {
        createdAt: 'DESC',
        schedules: {
          dayOfWeek: 'ASC',
          startTime: 'ASC',
        },
      },
    });
  }

  async findOne(id: string): Promise<TrainingGroup> {
    const group = await this.groupsRepository.findOne({
      where: {
        id,
      },
      relations: {
        branch: true,
        coach: true,
        program: {
          sport: true,
        },
        schedules: true,
      },
      order: {
        schedules: {
          dayOfWeek: 'ASC',
          startTime: 'ASC',
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Training group not found');
    }

    return group;
  }

  async update(
    id: string,
    dto: UpdateTrainingGroupDto,
  ): Promise<TrainingGroup> {
    const existingGroup = await this.findOne(id);

    const branchId = dto.branchId ?? existingGroup.branchId;

    const programId = dto.programId ?? existingGroup.programId;

    const coachId =
      dto.coachId !== undefined ? dto.coachId : existingGroup.coachId;

    await this.validateReferences(
      existingGroup.academyId,
      branchId,
      programId,
      coachId,
    );

    const group = this.groupsRepository.merge(existingGroup, {
      ...dto,
      branchId,
      programId,
      coachId,
      name: dto.name ? dto.name.trim() : existingGroup.name,
      code: dto.code ? dto.code.trim().toUpperCase() : existingGroup.code,
      notes:
        dto.notes !== undefined
          ? dto.notes.trim() || null
          : existingGroup.notes,
    });

    try {
      await this.groupsRepository.save(group);

      return await this.findOne(id);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async addSchedule(
    groupId: string,
    dto: CreateTrainingGroupScheduleDto,
  ): Promise<TrainingGroup> {
    await this.findOne(groupId);

    this.validateSchedules([dto]);

    const schedule = this.schedulesRepository.create({
      groupId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      venueName: dto.venueName?.trim() || null,
      isActive: dto.isActive ?? true,
    });

    try {
      await this.schedulesRepository.save(schedule);

      return await this.findOne(groupId);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async removeSchedule(groupId: string, scheduleId: string): Promise<void> {
    const schedule = await this.schedulesRepository.findOne({
      where: {
        id: scheduleId,
        groupId,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Training group schedule not found');
    }

    await this.schedulesRepository.softRemove(schedule);
  }

  async remove(id: string): Promise<void> {
    const group = await this.findOne(id);

    await this.groupsRepository.softRemove(group);
  }

  private async validateReferences(
    academyId: string,
    branchId: string,
    programId: string,
    coachId?: string | null,
  ): Promise<void> {
    const branch = await this.branchesService.findOne(branchId);

    if (branch.academyId !== academyId) {
      throw new BadRequestException(
        'Branch does not belong to the selected academy',
      );
    }

    const program = await this.programsService.findOne(programId);

    if (program.academyId !== academyId) {
      throw new BadRequestException(
        'Training program does not belong to the selected academy',
      );
    }

    if (coachId) {
      const coach = await this.usersService.findProfileById(coachId);

      const coachMembership = coach.memberships.find(
        (membership) =>
          membership.academyId === academyId &&
          membership.role === AcademyRole.COACH &&
          membership.isActive,
      );

      if (!coachMembership) {
        throw new BadRequestException(
          'Selected user is not an active coach in this academy',
        );
      }
    }
  }

  private validateSchedules(schedules: CreateTrainingGroupScheduleDto[]): void {
    const slots = new Set<string>();

    for (const schedule of schedules) {
      if (schedule.startTime >= schedule.endTime) {
        throw new BadRequestException(
          'Schedule endTime must be after startTime',
        );
      }

      const slot = `${schedule.dayOfWeek}-${schedule.startTime}`;

      if (slots.has(slot)) {
        throw new BadRequestException('Duplicate training schedule slot');
      }

      slots.add(slot);
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
        'The group code or schedule slot already exists',
      );
    }

    if (error instanceof QueryFailedError && postgresCode === '23503') {
      throw new NotFoundException(
        'Related academy, branch, program or coach was not found',
      );
    }

    throw error;
  }
}
