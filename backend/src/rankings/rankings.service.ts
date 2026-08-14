import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  randomUUID,
} from 'crypto';

import {
  Repository,
} from 'typeorm';

import {
  AcademyRole,
} from '../memberships/entities/academy-membership.entity';
import {
  Trainee,
} from '../trainees/entities/trainee.entity';

import {
  UpdateTraineeRankingDto,
} from './dto/update-trainee-ranking.dto';

import {
  TraineeRanking,
} from './entities/trainee-ranking.entity';

export interface RankingResult {
  rank: number;
  traineeId: string;
  registrationCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  profileImageUrl: string | null;
  branchId: string;
  points: number;
  note: string | null;
}

@Injectable()
export class RankingsService {
  constructor(
    @InjectRepository(
      TraineeRanking,
    )
    private readonly rankingsRepository:
      Repository<TraineeRanking>,

    @InjectRepository(Trainee)
    private readonly traineesRepository:
      Repository<Trainee>,
  ) {}

  async findAdminList(
    academyId: string | null,
    currentBranchId: string | null,
    currentRole: AcademyRole,
  ): Promise<RankingResult[]> {
    this.ensureAcademy(
      academyId,
    );

    const branchRestricted =
      currentRole === AcademyRole.BRANCH_MANAGER ||
      currentRole === AcademyRole.RECEPTIONIST ||
      currentRole === AcademyRole.COACH;

    if (
      branchRestricted &&
      !currentBranchId
    ) {
      throw new ForbiddenException(
        'Branch context is required',
      );
    }

    const rows =
      await this.traineesRepository
        .createQueryBuilder(
          'trainee',
        )
        .leftJoin(
          TraineeRanking,
          'ranking',
          `
            ranking.traineeId =
              trainee.id
            AND ranking.academyId =
              :academyId
            AND "ranking"."deleted_at"
              IS NULL
          `,
          {
            academyId,
          },
        )
        .where(
          'trainee.academyId = :academyId',
          {
            academyId,
          },
        )
        .andWhere(
          'trainee.deletedAt IS NULL',
        )
        .andWhere(
          'trainee.isActive = TRUE',
        )
        .andWhere(
          branchRestricted
            ? 'trainee.branchId = :currentBranchId'
            : '1 = 1',
          branchRestricted
            ? {
                currentBranchId,
              }
            : {},
        )
        .select(
          'trainee.id',
          'traineeId',
        )
        .addSelect(
          'trainee.registrationCode',
          'registrationCode',
        )
        .addSelect(
          'trainee.firstName',
          'firstName',
        )
        .addSelect(
          'trainee.lastName',
          'lastName',
        )
        .addSelect(
          'trainee.profileImageUrl',
          'profileImageUrl',
        )
        .addSelect(
          'trainee.branchId',
          'branchId',
        )
        .addSelect(
          'COALESCE(ranking.points, 0)',
          'points',
        )
        .addSelect(
          'ranking.note',
          'note',
        )
        .orderBy(
          'COALESCE(ranking.points, 0)',
          'DESC',
        )
        .addOrderBy(
          'trainee.firstName',
          'ASC',
        )
        .addOrderBy(
          'trainee.lastName',
          'ASC',
        )
        .getRawMany<{
          traineeId: string;
          registrationCode: string;
          firstName: string;
          lastName: string;
          profileImageUrl:
            string | null;
          branchId: string;
          points:
            number | string;
          note: string | null;
        }>();

    return rows.map(
      (row, index) => ({
        rank: index + 1,
        traineeId:
          row.traineeId,
        registrationCode:
          row.registrationCode,
        firstName:
          row.firstName,
        lastName:
          row.lastName,
        fullName:
          `${row.firstName} ${row.lastName}`,
        profileImageUrl:
          row.profileImageUrl,
        branchId:
          row.branchId,
        points:
          Number(row.points),
        note:
          row.note,
      }),
    );
  }

  async findTopTen(
    academyId: string | null,
  ): Promise<RankingResult[]> {
    // Top ten intentionally remains academy-wide.
    const list =
      await this.findAdminList(
        academyId,
        null,
        AcademyRole.ACADEMY_ADMIN,
      );

    return list
      .filter(
        (item) =>
          item.points > 0,
      )
      .slice(0, 10)
      .map(
        (item, index) => ({
          ...item,
          rank: index + 1,
        }),
      );
  }

  async update(
    traineeId: string,
    academyId: string | null,
    currentBranchId: string | null,
    currentRole: AcademyRole,
    userId: string,
    dto: UpdateTraineeRankingDto,
  ): Promise<RankingResult> {
    this.ensureAcademy(
      academyId,
    );

    const branchRestricted =
      currentRole === AcademyRole.BRANCH_MANAGER ||
      currentRole === AcademyRole.RECEPTIONIST ||
      currentRole === AcademyRole.COACH;

    if (
      branchRestricted &&
      !currentBranchId
    ) {
      throw new ForbiddenException(
        'Branch context is required',
      );
    }

    const trainee =
      await this.traineesRepository
        .findOne({
          where: {
            id: traineeId,
            academyId:
              academyId as string,
          },
        });

    if (!trainee) {
      throw new NotFoundException(
        'المتدرب غير موجود في الأكاديمية.',
      );
    }

    if (
      branchRestricted &&
      trainee.branchId !== currentBranchId
    ) {
      throw new ForbiddenException(
        'You cannot access another branch',
      );
    }

    let ranking =
      await this.rankingsRepository
        .findOne({
          where: {
            academyId:
              academyId as string,
            traineeId,
          },

          withDeleted: true,
        });

    if (ranking) {
      ranking.points =
        dto.points;

      ranking.note =
        dto.note?.trim() ||
        null;

      ranking.updatedByUserId =
        userId;

      ranking.deletedAt =
        null;
    } else {
      ranking =
        this.rankingsRepository
          .create({
            id: randomUUID(),
            academyId:
              academyId as string,
            traineeId,
            updatedByUserId:
              userId,
            points:
              dto.points,
            note:
              dto.note?.trim() ||
              null,
          });
    }

    await this.rankingsRepository
      .save(ranking);

    const list =
      await this.findAdminList(
        academyId,
        currentBranchId,
        currentRole,
      );

    const result =
      list.find(
        (item) =>
          item.traineeId ===
          traineeId,
      );

    if (!result) {
      throw new NotFoundException(
        'تعذر تحميل ترتيب المتدرب.',
      );
    }

    return result;
  }

  async remove(
    traineeId: string,
    academyId: string | null,
    currentBranchId: string | null,
    currentRole: AcademyRole,
  ): Promise<{
    message: string;
  }> {
    this.ensureAcademy(
      academyId,
    );

    const branchRestricted =
      currentRole === AcademyRole.BRANCH_MANAGER ||
      currentRole === AcademyRole.RECEPTIONIST ||
      currentRole === AcademyRole.COACH;

    if (
      branchRestricted &&
      !currentBranchId
    ) {
      throw new ForbiddenException(
        'Branch context is required',
      );
    }

    if (branchRestricted) {
      const trainee =
        await this.traineesRepository
          .findOne({
            where: {
              id: traineeId,
              academyId:
                academyId as string,
            },
          });

      if (!trainee) {
        throw new NotFoundException(
          'المتدرب غير موجود في الأكاديمية.',
        );
      }

      if (
        trainee.branchId !== currentBranchId
      ) {
        throw new ForbiddenException(
          'You cannot access another branch',
        );
      }
    }

    const ranking =
      await this.rankingsRepository
        .findOne({
          where: {
            academyId:
              academyId as string,
            traineeId,
          },
        });

    if (!ranking) {
      return {
        message:
          'لا توجد نقاط مسجلة للمتدرب.',
      };
    }

    await this.rankingsRepository
      .softDelete(
        ranking.id,
      );

    return {
      message:
        'تم حذف نقاط المتدرب.',
    };
  }

  private ensureAcademy(
    academyId: string | null,
  ): asserts academyId is string {
    if (!academyId) {
      throw new ForbiddenException(
        'لا توجد أكاديمية مرتبطة بالحساب.',
      );
    }
  }
}
