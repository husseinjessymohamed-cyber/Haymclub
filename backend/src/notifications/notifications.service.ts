import {
  BadRequestException,
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
  Brackets,
  IsNull,
  QueryFailedError,
  Repository,
} from 'typeorm';

import {
  Branch,
} from '../branches/entities/branch.entity';
import {
  AcademyRole,
} from '../memberships/entities/academy-membership.entity';

import {
  CreateNotificationDto,
} from './dto/create-notification.dto';

import {
  AcademyNotificationRead,
} from './entities/academy-notification-read.entity';

import {
  AcademyNotification,
  NotificationAudience,
} from './entities/academy-notification.entity';

export interface MyNotificationResult {
  id: string;
  title: string;
  body: string;
  audience: NotificationAudience;
  branchId: string | null;
  publishedAt: Date;
  createdAt: Date;
  isRead: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(
      AcademyNotification,
    )
    private readonly notificationsRepository:
      Repository<AcademyNotification>,

    @InjectRepository(
      AcademyNotificationRead,
    )
    private readonly readsRepository:
      Repository<AcademyNotificationRead>,

    @InjectRepository(Branch)
    private readonly branchesRepository:
      Repository<Branch>,
  ) {}

  async create(
    senderUserId: string,
    academyId: string | null,
    currentBranchId: string | null,
    currentRole: AcademyRole,
    dto: CreateNotificationDto,
  ): Promise<AcademyNotification> {
    if (!academyId) {
      throw new ForbiddenException(
        'لا توجد أكاديمية مرتبطة بالحساب.',
      );
    }

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

    if (
      branchRestricted &&
      dto.audience ===
        NotificationAudience.ALL_TRAINEES
    ) {
      throw new ForbiddenException(
        'You cannot send academy-wide notifications',
      );
    }

    let branchId: string | null =
      null;

    if (
      dto.audience ===
      NotificationAudience.BRANCH_TRAINEES
    ) {
      if (
        branchRestricted &&
        dto.branchId &&
        dto.branchId !== currentBranchId
      ) {
        throw new ForbiddenException(
          'You cannot access another branch',
        );
      }

      branchId = branchRestricted
        ? currentBranchId
        : dto.branchId ??
          currentBranchId;

      if (!branchId) {
        throw new BadRequestException(
          'يجب تحديد الفرع لإرسال الإشعار.',
        );
      }

      const branch =
        await this.branchesRepository
          .findOne({
            where: {
              id: branchId,
              academyId,
            },
          });

      if (!branch) {
        throw new BadRequestException(
          'الفرع غير موجود أو لا يتبع الأكاديمية.',
        );
      }
    }

    const notification =
      this.notificationsRepository.create({
        id: randomUUID(),
        academyId,
        branchId,
        senderUserId,
        title: dto.title.trim(),
        body: dto.body.trim(),
        audience: dto.audience,
        publishedAt: new Date(),
      });

    return this.notificationsRepository
      .save(notification);
  }

  async findAdminNotifications(
    academyId: string | null,
    currentBranchId: string | null,
    currentRole: AcademyRole,
  ): Promise<AcademyNotification[]> {
    if (!academyId) {
      throw new ForbiddenException(
        'لا توجد أكاديمية مرتبطة بالحساب.',
      );
    }

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

    return this.notificationsRepository
      .find({
        where: branchRestricted
          ? [
              {
                academyId,
                branchId:
                  currentBranchId as string,
              },
              {
                academyId,
                branchId: IsNull(),
              },
            ]
          : {
              academyId,
            },

        order: {
          publishedAt: 'DESC',
        },

        take: 100,
      });
  }

  async findMyNotifications(
    userId: string,
    academyId: string | null,
    branchId: string | null,
  ): Promise<MyNotificationResult[]> {
    if (!academyId) {
      return [];
    }

    const query =
      this.notificationsRepository
        .createQueryBuilder(
          'notification',
        )
        .leftJoin(
          AcademyNotificationRead,
          'notificationRead',
          `
            notificationRead.notificationId =
              notification.id
            AND notificationRead.userId =
              :userId
          `,
          {
            userId,
          },
        )
        .where(
          'notification.academyId = :academyId',
          {
            academyId,
          },
        )
        .andWhere(
          'notification.deletedAt IS NULL',
        )
        .andWhere(
          'notification.publishedAt <= :now',
          {
            now: new Date(),
          },
        )
        .andWhere(
          new Brackets(
            (audienceQuery) => {
              audienceQuery.where(
                `
                  notification.audience =
                    :allAudience
                `,
                {
                  allAudience:
                    NotificationAudience
                      .ALL_TRAINEES,
                },
              );

              if (branchId) {
                audienceQuery.orWhere(
                  `
                    notification.audience =
                      :branchAudience
                    AND notification.branchId =
                      :branchId
                  `,
                  {
                    branchAudience:
                      NotificationAudience
                        .BRANCH_TRAINEES,
                    branchId,
                  },
                );
              }
            },
          ),
        )
        .select(
          'notification.id',
          'id',
        )
        .addSelect(
          'notification.title',
          'title',
        )
        .addSelect(
          'notification.body',
          'body',
        )
        .addSelect(
          'notification.audience',
          'audience',
        )
        .addSelect(
          'notification.branchId',
          'branchId',
        )
        .addSelect(
          'notification.publishedAt',
          'publishedAt',
        )
        .addSelect(
          'notification.createdAt',
          'createdAt',
        )
        .addSelect(
          `
            CASE
              WHEN notificationRead.id IS NULL
                THEN FALSE
              ELSE TRUE
            END
          `,
          'isRead',
        )
        .orderBy(
          'notification.publishedAt',
          'DESC',
        )
        .limit(100);

    const rows =
      await query.getRawMany<{
        id: string;
        title: string;
        body: string;
        audience: NotificationAudience;
        branchId: string | null;
        publishedAt: Date;
        createdAt: Date;
        isRead: boolean | string;
      }>();

    return rows.map(
      (row) => ({
        ...row,
        isRead:
          row.isRead === true ||
          row.isRead === 'true',
      }),
    );
  }

  async unreadCount(
    userId: string,
    academyId: string | null,
    branchId: string | null,
  ): Promise<{ count: number }> {
    const notifications =
      await this.findMyNotifications(
        userId,
        academyId,
        branchId,
      );

    return {
      count:
        notifications.filter(
          (notification) =>
            !notification.isRead,
        ).length,
    };
  }

  async markAsRead(
    notificationId: string,
    userId: string,
    academyId: string | null,
    branchId: string | null,
  ): Promise<{ message: string }> {
    const notification =
      await this.findAccessibleNotification(
        notificationId,
        academyId,
        branchId,
      );

    const existing =
      await this.readsRepository
        .findOne({
          where: {
            notificationId:
              notification.id,
            userId,
          },
        });

    if (existing) {
      return {
        message:
          'تم تسجيل قراءة الإشعار.',
      };
    }

    const read =
      this.readsRepository.create({
        id: randomUUID(),
        notificationId:
          notification.id,
        userId,
        readAt: new Date(),
      });

    try {
      await this.readsRepository.save(
        read,
      );
    } catch (error) {
      const postgresCode = (
        error as {
          driverError?: {
            code?: string;
          };
        }
      )?.driverError?.code;

      if (
        !(
          error instanceof QueryFailedError &&
          postgresCode === '23505'
        )
      ) {
        throw error;
      }
    }

    return {
      message:
        'تم تسجيل قراءة الإشعار.',
    };
  }

  async remove(
    notificationId: string,
    academyId: string | null,
    currentBranchId: string | null,
    currentRole: AcademyRole,
  ): Promise<{ message: string }> {
    if (!academyId) {
      throw new ForbiddenException(
        'لا توجد أكاديمية مرتبطة بالحساب.',
      );
    }

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

    const notification =
      await this.notificationsRepository
        .findOne({
          where: {
            id: notificationId,
            academyId,
          },
        });

    if (!notification) {
      throw new NotFoundException(
        'الإشعار غير موجود.',
      );
    }

    if (
      branchRestricted &&
      notification.branchId !== currentBranchId
    ) {
      throw new ForbiddenException(
        'You cannot access another branch',
      );
    }

    await this.notificationsRepository
      .softDelete(notification.id);

    return {
      message:
        'تم حذف الإشعار بنجاح.',
    };
  }

  private async findAccessibleNotification(
    notificationId: string,
    academyId: string | null,
    branchId: string | null,
  ): Promise<AcademyNotification> {
    if (!academyId) {
      throw new NotFoundException(
        'الإشعار غير موجود.',
      );
    }

    const query =
      this.notificationsRepository
        .createQueryBuilder(
          'notification',
        )
        .where(
          'notification.id = :notificationId',
          {
            notificationId,
          },
        )
        .andWhere(
          'notification.academyId = :academyId',
          {
            academyId,
          },
        )
        .andWhere(
          'notification.deletedAt IS NULL',
        )
        .andWhere(
          new Brackets(
            (audienceQuery) => {
              audienceQuery.where(
                `
                  notification.audience =
                    :allAudience
                `,
                {
                  allAudience:
                    NotificationAudience
                      .ALL_TRAINEES,
                },
              );

              if (branchId) {
                audienceQuery.orWhere(
                  `
                    notification.audience =
                      :branchAudience
                    AND notification.branchId =
                      :branchId
                  `,
                  {
                    branchAudience:
                      NotificationAudience
                        .BRANCH_TRAINEES,
                    branchId,
                  },
                );
              }
            },
          ),
        );

    const notification =
      await query.getOne();

    if (!notification) {
      throw new NotFoundException(
        'الإشعار غير موجود.',
      );
    }

    return notification;
  }
}
