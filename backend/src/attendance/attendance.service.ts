import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';

import {
  EnrollmentStatus,
  GroupEnrollment,
} from '../trainees/entities/group-enrollment.entity';
import { Trainee } from '../trainees/entities/trainee.entity';
import { TrainingGroupsService } from '../training-groups/training-groups.service';
import { AcademyRole } from '../memberships/entities/academy-membership.entity';
import { UsersService } from '../users/users.service';
import { CreateTrainingSessionDto } from './dto/create-training-session.dto';
import { MarkAttendanceRecordDto } from './dto/mark-attendance.dto';
import { UpdateTrainingSessionDto } from './dto/update-training-session.dto';
import {
  AttendanceRecord,
  AttendanceStatus,
} from './entities/attendance-record.entity';
import {
  TrainingSession,
  TrainingSessionStatus,
} from './entities/training-session.entity';

export interface TrainingSessionFilters {
  academyId?: string;
  branchId?: string;
  groupId?: string;
  coachId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: TrainingSessionStatus;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(TrainingSession)
    private readonly sessionsRepository: Repository<TrainingSession>,

    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,

    @InjectRepository(GroupEnrollment)
    private readonly enrollmentsRepository: Repository<GroupEnrollment>,

    @InjectRepository(Trainee)
    private readonly traineesRepository: Repository<Trainee>,

    private readonly dataSource: DataSource,
    private readonly trainingGroupsService: TrainingGroupsService,
    private readonly usersService: UsersService,
  ) {}

  async createSession(dto: CreateTrainingSessionDto): Promise<TrainingSession> {
    this.validateTimes(dto.startTime, dto.endTime);

    const group = await this.trainingGroupsService.findOne(dto.groupId);

    if (group.academyId !== dto.academyId) {
      throw new BadRequestException(
        'Training group does not belong to the selected academy',
      );
    }

    if (group.branchId !== dto.branchId) {
      throw new BadRequestException(
        'Training group does not belong to the selected branch',
      );
    }

    const coachId = dto.coachId !== undefined ? dto.coachId : group.coachId;

    await this.validateCoach(dto.academyId, coachId);

    try {
      const sessionId = await this.dataSource.transaction(async (manager) => {
        const sessionsRepository = manager.getRepository(TrainingSession);

        const attendanceRepository = manager.getRepository(AttendanceRecord);

        const enrollmentsRepository = manager.getRepository(GroupEnrollment);

        const session = sessionsRepository.create({
          academyId: dto.academyId,
          branchId: dto.branchId,
          groupId: dto.groupId,
          coachId,
          sessionDate: dto.sessionDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          venueName: dto.venueName?.trim() || null,
          status: TrainingSessionStatus.SCHEDULED,
          notes: dto.notes?.trim() || null,
          isActive: true,
        });

        const savedSession = await sessionsRepository.save(session);

        if (dto.generateRoster !== false) {
          const enrollments = await enrollmentsRepository.find({
            where: {
              groupId: dto.groupId,
              status: EnrollmentStatus.ACTIVE,
            },
          });

          if (enrollments.length > 0) {
            const records = enrollments.map((enrollment) =>
              attendanceRepository.create({
                academyId: dto.academyId,
                sessionId: savedSession.id,
                traineeId: enrollment.traineeId,
                status: AttendanceStatus.NOT_MARKED,
                checkInAt: null,
                notes: null,
              }),
            );

            await attendanceRepository.save(records);
          }
        }

        return savedSession.id;
      });

      return await this.findSession(sessionId);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findSessions(
    filters: TrainingSessionFilters,
  ): Promise<TrainingSession[]> {
    const query = this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.branch', 'branch')
      .leftJoinAndSelect('session.group', 'trainingGroup')
      .leftJoinAndSelect('trainingGroup.program', 'program')
      .leftJoinAndSelect('program.sport', 'sport')
      .leftJoinAndSelect('session.coach', 'coach')
      .leftJoinAndSelect('session.attendanceRecords', 'attendanceRecord')
      .leftJoinAndSelect('attendanceRecord.trainee', 'trainee')
      .where('session.deletedAt IS NULL')
      .orderBy('session.sessionDate', 'DESC')
      .addOrderBy('session.startTime', 'ASC');

    if (filters.academyId) {
      query.andWhere('session.academyId = :academyId', {
        academyId: filters.academyId,
      });
    }

    if (filters.branchId) {
      query.andWhere('session.branchId = :branchId', {
        branchId: filters.branchId,
      });
    }

    if (filters.groupId) {
      query.andWhere('session.groupId = :groupId', {
        groupId: filters.groupId,
      });
    }

    if (filters.coachId) {
      query.andWhere('session.coachId = :coachId', {
        coachId: filters.coachId,
      });
    }

    if (filters.status) {
      query.andWhere('session.status = :status', {
        status: filters.status,
      });
    }

    if (filters.dateFrom) {
      query.andWhere('session.sessionDate >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      query.andWhere('session.sessionDate <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    return query.getMany();
  }

  async findSession(id: string): Promise<TrainingSession> {
    const session = await this.sessionsRepository.findOne({
      where: {
        id,
      },
      relations: {
        branch: true,
        group: {
          program: {
            sport: true,
          },
          schedules: true,
        },
        coach: true,
        attendanceRecords: {
          trainee: true,
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Training session not found');
    }

    return session;
  }

  async updateSession(
    id: string,
    dto: UpdateTrainingSessionDto,
  ): Promise<TrainingSession> {
    const session = await this.findSession(id);

    const startTime = dto.startTime ?? session.startTime.slice(0, 5);

    const endTime = dto.endTime ?? session.endTime.slice(0, 5);

    this.validateTimes(startTime, endTime);

    const coachId = dto.coachId !== undefined ? dto.coachId : session.coachId;

    await this.validateCoach(session.academyId, coachId);

    const updated = this.sessionsRepository.merge(session, {
      ...dto,
      coachId,
      startTime,
      endTime,
      venueName:
        dto.venueName !== undefined
          ? dto.venueName.trim() || null
          : session.venueName,
      notes: dto.notes !== undefined ? dto.notes.trim() || null : session.notes,
    });

    try {
      await this.sessionsRepository.save(updated);

      return await this.findSession(id);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async markAttendance(
    sessionId: string,
    records: MarkAttendanceRecordDto[],
  ): Promise<TrainingSession> {
    const session = await this.findSession(sessionId);

    if (session.status === TrainingSessionStatus.CANCELLED) {
      throw new BadRequestException(
        'Attendance cannot be recorded for a cancelled session',
      );
    }

    const traineeIds = records.map((record) => record.traineeId);

    if (new Set(traineeIds).size !== traineeIds.length) {
      throw new BadRequestException('Duplicate trainee in attendance records');
    }

    const enrollments = await this.enrollmentsRepository.find({
      where: {
        groupId: session.groupId,
        traineeId: In(traineeIds),
        status: EnrollmentStatus.ACTIVE,
      },
    });

    const enrolledTraineeIds = new Set(
      enrollments.map((enrollment) => enrollment.traineeId),
    );

    const invalidTrainee = traineeIds.find(
      (traineeId) => !enrolledTraineeIds.has(traineeId),
    );

    if (invalidTrainee) {
      throw new BadRequestException(
        'One or more trainees are not actively enrolled in this group',
      );
    }

    const existingRecords = await this.attendanceRepository.find({
      where: {
        sessionId,
        traineeId: In(traineeIds),
      },
    });

    const recordsByTrainee = new Map(
      existingRecords.map((record) => [record.traineeId, record]),
    );

    const attendanceRecords = records.map((dto) => {
      const record =
        recordsByTrainee.get(dto.traineeId) ??
        this.attendanceRepository.create({
          academyId: session.academyId,
          sessionId: session.id,
          traineeId: dto.traineeId,
        });

      record.status = dto.status;

      record.checkInAt = dto.checkInAt
        ? new Date(dto.checkInAt)
        : dto.status === AttendanceStatus.PRESENT ||
            dto.status === AttendanceStatus.LATE
          ? new Date()
          : null;

      record.notes = dto.notes?.trim() || null;

      return record;
    });

    try {
      await this.attendanceRepository.save(attendanceRecords);

      return await this.findSession(sessionId);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async getTraineeStats(traineeId: string) {
    const trainee = await this.traineesRepository.findOne({
      where: {
        id: traineeId,
      },
    });

    if (!trainee) {
      throw new NotFoundException('Trainee not found');
    }

    const records = await this.attendanceRepository.find({
      where: {
        traineeId,
      },
      relations: {
        session: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const validRecords = records.filter(
      (record) => record.session.status !== TrainingSessionStatus.CANCELLED,
    );

    const counts = {
      NOT_MARKED: 0,
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };

    for (const record of validRecords) {
      counts[record.status] += 1;
    }

    const markedSessions = validRecords.length - counts.NOT_MARKED;

    const attendedSessions = counts.PRESENT + counts.LATE;

    const attendanceRate =
      markedSessions > 0
        ? Number(((attendedSessions / markedSessions) * 100).toFixed(2))
        : 0;

    return {
      trainee: {
        id: trainee.id,
        registrationCode: trainee.registrationCode,
        firstName: trainee.firstName,
        lastName: trainee.lastName,
      },
      totalSessions: validRecords.length,
      markedSessions,
      attendanceRate,
      counts,
    };
  }

  async removeSession(id: string): Promise<void> {
    const session = await this.findSession(id);

    await this.sessionsRepository.softRemove(session);
  }

  private async validateCoach(
    academyId: string,
    coachId: string | null,
  ): Promise<void> {
    if (!coachId) {
      return;
    }

    const coach = await this.usersService.findProfileById(coachId);

    const membership = coach.memberships.find(
      (item) =>
        item.academyId === academyId &&
        item.role === AcademyRole.COACH &&
        item.isActive,
    );

    if (!membership) {
      throw new BadRequestException(
        'Selected user is not an active coach in this academy',
      );
    }
  }

  private validateTimes(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('Session endTime must be after startTime');
    }
  }

  private handleDatabaseError(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
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
        'A session or attendance record already exists',
      );
    }

    if (error instanceof QueryFailedError && postgresCode === '23503') {
      throw new NotFoundException(
        'Related group, coach, trainee or session was not found',
      );
    }

    throw error;
  }
}
