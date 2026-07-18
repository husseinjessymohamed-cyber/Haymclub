import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';

import { BranchesService } from '../branches/branches.service';
import { TrainingGroupsService } from '../training-groups/training-groups.service';
import { AddGuardianDto } from './dto/add-guardian.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateTraineeDto } from './dto/create-trainee.dto';
import { UpdateTraineeDto } from './dto/update-trainee.dto';
import {
  EnrollmentStatus,
  GroupEnrollment,
} from './entities/group-enrollment.entity';
import { Guardian } from './entities/guardian.entity';
import { TraineeGuardian } from './entities/trainee-guardian.entity';
import { Trainee, TraineeStatus } from './entities/trainee.entity';

export interface TraineeFilters {
  academyId?: string;
  branchId?: string;
  q?: string;
  isActive?: boolean;
}

@Injectable()
export class TraineesService {
  constructor(
    @InjectRepository(Trainee)
    private readonly traineesRepository: Repository<Trainee>,

    @InjectRepository(Guardian)
    private readonly guardiansRepository: Repository<Guardian>,

    @InjectRepository(TraineeGuardian)
    private readonly traineeGuardiansRepository: Repository<TraineeGuardian>,

    @InjectRepository(GroupEnrollment)
    private readonly enrollmentsRepository: Repository<GroupEnrollment>,

    private readonly dataSource: DataSource,
    private readonly branchesService: BranchesService,
    private readonly trainingGroupsService: TrainingGroupsService,
  ) {}

  async create(dto: CreateTraineeDto): Promise<Trainee> {
    const branch = await this.branchesService.findOne(dto.branchId);

    if (branch.academyId !== dto.academyId) {
      throw new BadRequestException(
        'Branch does not belong to the selected academy',
      );
    }

    this.validateDateOfBirth(dto.dateOfBirth);

    try {
      const traineeId = await this.dataSource.transaction(async (manager) => {
        const traineeRepository = manager.getRepository(Trainee);

        const trainee = traineeRepository.create({
          academyId: dto.academyId,
          branchId: dto.branchId,
          registrationCode:
            dto.registrationCode?.trim().toUpperCase() ??
            this.generateRegistrationCode(),
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          dateOfBirth: dto.dateOfBirth,
          gender: dto.gender,
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim().toLowerCase() || null,
          medicalNotes: dto.medicalNotes?.trim() || null,
          emergencyNotes: dto.emergencyNotes?.trim() || null,
          status: dto.status ?? TraineeStatus.ACTIVE,
          isActive: dto.isActive ?? true,
        });

        const savedTrainee = await traineeRepository.save(trainee);

        if (dto.primaryGuardian) {
          await this.createGuardianLink(manager, savedTrainee, {
            ...dto.primaryGuardian,
            isPrimary: true,
          });
        }

        return savedTrainee.id;
      });

      return await this.findOne(traineeId);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findAll(filters: TraineeFilters): Promise<Trainee[]> {
    const query = this.traineesRepository
      .createQueryBuilder('trainee')
      .leftJoinAndSelect('trainee.branch', 'branch')
      .leftJoinAndSelect('trainee.guardianLinks', 'guardianLink')
      .leftJoinAndSelect('guardianLink.guardian', 'guardian')
      .leftJoinAndSelect('trainee.enrollments', 'enrollment')
      .leftJoinAndSelect('enrollment.group', 'trainingGroup')
      .where('trainee.deletedAt IS NULL')
      .orderBy('trainee.createdAt', 'DESC');

    if (filters.academyId) {
      query.andWhere('trainee.academyId = :academyId', {
        academyId: filters.academyId,
      });
    }

    if (filters.branchId) {
      query.andWhere('trainee.branchId = :branchId', {
        branchId: filters.branchId,
      });
    }

    if (filters.isActive !== undefined) {
      query.andWhere('trainee.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters.q?.trim()) {
      query.andWhere(
        `(
          LOWER(trainee.firstName) LIKE LOWER(:search)
          OR LOWER(trainee.lastName) LIKE LOWER(:search)
          OR LOWER(trainee.registrationCode) LIKE LOWER(:search)
          OR trainee.phone LIKE :search
        )`,
        {
          search: `%${filters.q.trim()}%`,
        },
      );
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Trainee> {
    const trainee = await this.traineesRepository.findOne({
      where: {
        id,
      },
      relations: {
        branch: true,
        guardianLinks: {
          guardian: true,
        },
        enrollments: {
          group: {
            program: {
              sport: true,
            },
            coach: true,
            schedules: true,
          },
        },
      },
    });

    if (!trainee) {
      throw new NotFoundException('Trainee not found');
    }

    return trainee;
  }

  async update(id: string, dto: UpdateTraineeDto): Promise<Trainee> {
    const trainee = await this.findOne(id);

    if (dto.branchId) {
      const branch = await this.branchesService.findOne(dto.branchId);

      if (branch.academyId !== trainee.academyId) {
        throw new BadRequestException(
          'Branch does not belong to the trainee academy',
        );
      }
    }

    if (dto.dateOfBirth) {
      this.validateDateOfBirth(dto.dateOfBirth);
    }

    const updated = this.traineesRepository.merge(trainee, {
      ...dto,
      registrationCode: dto.registrationCode
        ? dto.registrationCode.trim().toUpperCase()
        : trainee.registrationCode,

      firstName: dto.firstName ? dto.firstName.trim() : trainee.firstName,

      lastName: dto.lastName ? dto.lastName.trim() : trainee.lastName,

      phone: dto.phone !== undefined ? dto.phone.trim() || null : trainee.phone,

      email:
        dto.email !== undefined
          ? dto.email.trim().toLowerCase() || null
          : trainee.email,

      medicalNotes:
        dto.medicalNotes !== undefined
          ? dto.medicalNotes.trim() || null
          : trainee.medicalNotes,

      emergencyNotes:
        dto.emergencyNotes !== undefined
          ? dto.emergencyNotes.trim() || null
          : trainee.emergencyNotes,
    });

    try {
      await this.traineesRepository.save(updated);

      return await this.findOne(id);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async addGuardian(traineeId: string, dto: AddGuardianDto): Promise<Trainee> {
    const trainee = await this.findOne(traineeId);

    try {
      await this.dataSource.transaction(async (manager) => {
        await this.createGuardianLink(manager, trainee, dto);
      });

      return await this.findOne(traineeId);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async enroll(
    traineeId: string,
    dto: CreateEnrollmentDto,
  ): Promise<GroupEnrollment> {
    const trainee = await this.findOne(traineeId);

    const group = await this.trainingGroupsService.findOne(dto.groupId);

    if (group.academyId !== trainee.academyId) {
      throw new BadRequestException(
        'Training group does not belong to the trainee academy',
      );
    }

    if (group.branchId !== trainee.branchId) {
      throw new BadRequestException(
        'Trainee and training group must belong to the same branch',
      );
    }

    this.validateTraineeAgeForGroup(
      trainee.dateOfBirth,
      group.program.minimumAge,
      group.program.maximumAge,
    );

    const existing = await this.enrollmentsRepository.findOne({
      where: {
        traineeId,
        groupId: group.id,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Trainee is already registered in this group',
      );
    }

    const occupiedPlaces = await this.enrollmentsRepository.count({
      where: {
        groupId: group.id,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.PAUSED]),
      },
    });

    const status =
      occupiedPlaces >= group.capacity
        ? EnrollmentStatus.WAITLISTED
        : EnrollmentStatus.ACTIVE;

    const enrollment = this.enrollmentsRepository.create({
      academyId: trainee.academyId,
      traineeId: trainee.id,
      groupId: group.id,
      enrollmentDate:
        dto.enrollmentDate ?? new Date().toISOString().slice(0, 10),
      status,
      notes: dto.notes?.trim() || null,
    });

    try {
      const saved = await this.enrollmentsRepository.save(enrollment);

      return await this.enrollmentsRepository.findOneOrFail({
        where: {
          id: saved.id,
        },
        relations: {
          trainee: true,
          group: {
            program: {
              sport: true,
            },
            coach: true,
            schedules: true,
          },
        },
      });
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findEnrollments(traineeId: string): Promise<GroupEnrollment[]> {
    await this.findOne(traineeId);

    return this.enrollmentsRepository.find({
      where: {
        traineeId,
      },
      relations: {
        group: {
          program: {
            sport: true,
          },
          coach: true,
          schedules: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async remove(id: string): Promise<void> {
    const trainee = await this.findOne(id);

    await this.traineesRepository.softRemove(trainee);
  }

  private async createGuardianLink(
    manager: EntityManager,
    trainee: Trainee,
    dto: AddGuardianDto,
  ): Promise<void> {
    const guardianRepository = manager.getRepository(Guardian);

    const linkRepository = manager.getRepository(TraineeGuardian);

    let guardian = await guardianRepository.findOne({
      where: {
        academyId: trainee.academyId,
        phone: dto.phone.trim(),
      },
    });

    if (!guardian) {
      guardian = guardianRepository.create({
        academyId: trainee.academyId,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone.trim(),
        email: dto.email?.trim().toLowerCase() || null,
        address: dto.address?.trim() || null,
        isActive: true,
      });

      guardian = await guardianRepository.save(guardian);
    }

    const existingLink = await linkRepository.findOne({
      where: {
        traineeId: trainee.id,
        guardianId: guardian.id,
      },
    });

    if (existingLink) {
      throw new ConflictException('Guardian is already linked to this trainee');
    }

    if (dto.isPrimary) {
      await linkRepository.update(
        {
          traineeId: trainee.id,
          isPrimary: true,
        },
        {
          isPrimary: false,
        },
      );
    }

    const link = linkRepository.create({
      academyId: trainee.academyId,
      traineeId: trainee.id,
      guardianId: guardian.id,
      relationship: dto.relationship,
      isPrimary: dto.isPrimary ?? false,
      canPickup: dto.canPickup ?? true,
      receivesNotifications: dto.receivesNotifications ?? true,
    });

    await linkRepository.save(link);
  }

  private generateRegistrationCode(): string {
    return `TRN-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private validateDateOfBirth(dateOfBirth: string): void {
    const birthDate = new Date(dateOfBirth);

    const today = new Date();

    if (Number.isNaN(birthDate.getTime()) || birthDate > today) {
      throw new BadRequestException('Invalid date of birth');
    }
  }

  private validateTraineeAgeForGroup(
    dateOfBirth: string,
    minimumAge: number | null,
    maximumAge: number | null,
  ): void {
    const age = this.calculateAge(dateOfBirth);

    if (minimumAge !== null && age < minimumAge) {
      throw new BadRequestException(
        `Trainee age must be at least ${minimumAge}`,
      );
    }

    if (maximumAge !== null && age > maximumAge) {
      throw new BadRequestException(
        `Trainee age must not exceed ${maximumAge}`,
      );
    }
  }

  private calculateAge(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);

    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age -= 1;
    }

    return age;
  }

  private handleDatabaseError(error: unknown): never {
    if (
      error instanceof ConflictException ||
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }

    const postgresCode = (
      error as {
        driverError?: {
          code?: string;
        };
      }
    )?.driverError?.code;

    if (error instanceof QueryFailedError && postgresCode === '23505') {
      throw new ConflictException(
        'Registration code, guardian phone or enrollment already exists',
      );
    }

    if (error instanceof QueryFailedError && postgresCode === '23503') {
      throw new NotFoundException(
        'Related academy, branch, trainee, guardian or group was not found',
      );
    }

    throw error;
  }
}
