import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  randomBytes,
} from 'crypto';

import * as bcrypt from 'bcrypt';

import {
  DataSource,
} from 'typeorm';

import {
  AcademyRole,
} from '../memberships/entities/academy-membership.entity';

import {
  PasswordResetService,
} from '../password-reset/password-reset.service';

import {
  TraineePortalAccountStatus,
} from '../trainees/entities/trainee.entity';

interface TraineeRow {
  id: string;
  academy_id: string;
  branch_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  portal_account_status:
    TraineePortalAccountStatus;
}

interface UserRow {
  id: string;
  email: string;
}

@Injectable()
export class TraineeInvitationsService {
  private readonly invitationMinutes = 30;

  constructor(
    private readonly dataSource:
      DataSource,

    private readonly passwordResetService:
      PasswordResetService,
  ) {}

  async approve(
    traineeId: string,
  ): Promise<{
    message: string;
    status: TraineePortalAccountStatus;
    email: string;
  }> {
    const trainee =
      await this.getTrainee(
        traineeId,
      );

    const email =
      trainee.email
        ?.trim()
        .toLowerCase();

    if (!email) {
      throw new BadRequestException(
        'يجب تسجيل بريد إلكتروني حقيقي للمتدرب قبل الموافقة.',
      );
    }

    if (
      trainee.portal_account_status ===
      TraineePortalAccountStatus.ACTIVE
    ) {
      throw new ConflictException(
        'حساب المتدرب مفعل بالفعل.',
      );
    }

    let user: UserRow | undefined;

    await this.dataSource.transaction(
      async (manager) => {
        const users =
          await manager.query(
            `
              SELECT id, email
              FROM users
              WHERE
                LOWER(email) = LOWER($1)
                AND deleted_at IS NULL
              LIMIT 1
              FOR UPDATE
            `,
            [email],
          ) as UserRow[];

        user = users[0];

        if (user) {
          const conflictingLinks =
            await manager.query(
              `
                SELECT id
                FROM portal_trainee_links
                WHERE
                  user_id = $1
                  AND trainee_id <> $2
                  AND deleted_at IS NULL
                LIMIT 1
              `,
              [
                user.id,
                trainee.id,
              ],
            ) as Array<{
              id: string;
            }>;

          if (
            conflictingLinks.length >
            0
          ) {
            throw new ConflictException(
              'هذا البريد مرتبط بمتدرب آخر بالفعل.',
            );
          }

          await manager.query(
            `
              UPDATE users
              SET
                first_name = $1,
                last_name = $2,
                email = $3,
                status = 'ACTIVE',
                updated_at = NOW()
              WHERE id = $4
            `,
            [
              trainee.first_name,
              trainee.last_name,
              email,
              user.id,
            ],
          );
        } else {
          const temporaryPassword =
            `${randomBytes(24)
              .toString('base64url')}Aa1!`;

          const passwordHash =
            await bcrypt.hash(
              temporaryPassword,
              12,
            );

          const createdUsers =
            await manager.query(
              `
                INSERT INTO users
                (
                  first_name,
                  last_name,
                  email,
                  phone,
                  password_hash,
                  status,
                  last_login_at,
                  created_at,
                  updated_at
                )
                SELECT
                  first_name,
                  last_name,
                  LOWER(email),
                  phone,
                  $2,
                  'ACTIVE',
                  NULL,
                  NOW(),
                  NOW()
                FROM trainees
                WHERE id = $1
                RETURNING id, email
              `,
              [
                trainee.id,
                passwordHash,
              ],
            ) as UserRow[];

          user =
            createdUsers[0];
        }

        if (!user) {
          throw new BadRequestException(
            'تعذر إنشاء حساب المتدرب.',
          );
        }

        await manager.query(
          `
            INSERT INTO academy_memberships
            (
              user_id,
              academy_id,
              branch_id,
              role,
              is_primary,
              is_active,
              created_at,
              updated_at
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              TRUE,
              TRUE,
              NOW(),
              NOW()
            )
            ON CONFLICT DO NOTHING
          `,
          [
            user.id,
            trainee.academy_id,
            trainee.branch_id,
            AcademyRole.TRAINEE,
          ],
        );

        const existingMemberships =
          await manager.query(
            `
              SELECT id
              FROM academy_memberships
              WHERE
                user_id = $1
                AND academy_id = $2
                AND role = 'TRAINEE'
                AND deleted_at IS NULL
              LIMIT 1
            `,
            [
              user.id,
              trainee.academy_id,
            ],
          ) as Array<{
            id: string;
          }>;

        if (
          existingMemberships.length ===
          0
        ) {
          await manager.query(
            `
              INSERT INTO academy_memberships
              (
                user_id,
                academy_id,
                branch_id,
                role,
                is_primary,
                is_active,
                created_at,
                updated_at
              )
              VALUES
              (
                $1,
                $2,
                $3,
                'TRAINEE',
                TRUE,
                TRUE,
                NOW(),
                NOW()
              )
            `,
            [
              user.id,
              trainee.academy_id,
              trainee.branch_id,
            ],
          );
        } else {
          await manager.query(
            `
              UPDATE academy_memberships
              SET
                branch_id = $1,
                is_primary = TRUE,
                is_active = TRUE,
                updated_at = NOW()
              WHERE id = $2
            `,
            [
              trainee.branch_id,
              existingMemberships[0].id,
            ],
          );
        }

        // إزالة أي SELF link قديم لنفس المتدرب
        // مع الاحتفاظ بالحساب الحقيقي الحالي.
        await manager.query(
          `
            UPDATE portal_trainee_links
            SET
              is_active = FALSE,
              deleted_at = NOW(),
              updated_at = NOW()
            WHERE
              trainee_id = $1
              AND relationship = 'SELF'
              AND user_id <> $2
              AND deleted_at IS NULL
          `,
          [
            trainee.id,
            user.id,
          ],
        );

        await manager.query(
          `
            INSERT INTO portal_trainee_links
            (
              academy_id,
              user_id,
              trainee_id,
              relationship,
              is_primary,
              is_active,
              created_at,
              updated_at
            )
            VALUES
            (
              $1,
              $2,
              $3,
              'SELF',
              TRUE,
              TRUE,
              NOW(),
              NOW()
            )
            ON CONFLICT
              (user_id, trainee_id)
            DO UPDATE SET
              is_primary = TRUE,
              is_active = TRUE,
              deleted_at = NULL,
              updated_at = NOW()
          `,
          [
            trainee.academy_id,
            user.id,
            trainee.id,
          ],
        );

        await manager.query(
          `
            UPDATE trainees
            SET
              portal_account_status =
                'INVITATION_SENT',
              portal_approved_at =
                COALESCE(
                  portal_approved_at,
                  NOW()
                ),
              portal_rejected_at = NULL,
              portal_invitation_sent_at =
                NOW(),
              portal_invitation_expires_at =
                NOW() +
                ($2 * INTERVAL '1 minute'),
              updated_at = NOW()
            WHERE id = $1
          `,
          [
            trainee.id,
            this.invitationMinutes,
          ],
        );
      },
    );

    try {
      await this.passwordResetService
        .forgotPassword({
          email,
        });
    } catch (error) {
      await this.dataSource.query(
        `
          UPDATE trainees
          SET
            portal_account_status =
              'PENDING_APPROVAL',
            portal_invitation_sent_at =
              NULL,
            portal_invitation_expires_at =
              NULL,
            updated_at = NOW()
          WHERE id = $1
        `,
        [trainee.id],
      );

      throw error;
    }

    return {
      message:
        'تمت الموافقة وإرسال رابط إنشاء كلمة المرور إلى بريد المتدرب.',
      status:
        TraineePortalAccountStatus
          .INVITATION_SENT,
      email,
    };
  }

  async reject(
    traineeId: string,
  ): Promise<{
    message: string;
    status: TraineePortalAccountStatus;
  }> {
    await this.getTrainee(
      traineeId,
    );

    await this.dataSource.query(
      `
        UPDATE trainees
        SET
          portal_account_status =
            'REJECTED',
          portal_rejected_at = NOW(),
          portal_approved_at = NULL,
          portal_invitation_sent_at =
            NULL,
          portal_invitation_expires_at =
            NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      [traineeId],
    );

    return {
      message:
        'تم رفض طلب إنشاء حساب المتدرب.',
      status:
        TraineePortalAccountStatus
          .REJECTED,
    };
  }

  async resend(
    traineeId: string,
  ): Promise<{
    message: string;
    status: TraineePortalAccountStatus;
    email: string;
  }> {
    const trainee =
      await this.getTrainee(
        traineeId,
      );

    const email =
      trainee.email
        ?.trim()
        .toLowerCase();

    if (!email) {
      throw new BadRequestException(
        'لا يوجد بريد إلكتروني صالح للمتدرب.',
      );
    }

    if (
      trainee.portal_account_status ===
      TraineePortalAccountStatus.ACTIVE
    ) {
      throw new ConflictException(
        'حساب المتدرب مفعل بالفعل ولا يحتاج إلى دعوة.',
      );
    }

    const users =
      await this.dataSource.query(
        `
          SELECT id, email
          FROM users
          WHERE
            LOWER(email) = LOWER($1)
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [email],
      ) as UserRow[];

    if (!users[0]) {
      return this.approve(
        traineeId,
      );
    }

    await this.passwordResetService
      .forgotPassword({
        email,
      });

    await this.dataSource.query(
      `
        UPDATE trainees
        SET
          portal_account_status =
            'INVITATION_SENT',
          portal_rejected_at = NULL,
          portal_invitation_sent_at =
            NOW(),
          portal_invitation_expires_at =
            NOW() +
            ($2 * INTERVAL '1 minute'),
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        trainee.id,
        this.invitationMinutes,
      ],
    );

    return {
      message:
        'تم إرسال دعوة جديدة إلى بريد المتدرب.',
      status:
        TraineePortalAccountStatus
          .INVITATION_SENT,
      email,
    };
  }

  async refreshExpiredStatuses():
  Promise<void> {
    await this.dataSource.query(
      `
        UPDATE trainees
        SET
          portal_account_status =
            'EXPIRED',
          updated_at = NOW()
        WHERE
          portal_account_status =
            'INVITATION_SENT'
          AND
            portal_invitation_expires_at
              IS NOT NULL
          AND
            portal_invitation_expires_at
              < NOW()
          AND deleted_at IS NULL
      `,
    );
  }

  private async getTrainee(
    traineeId: string,
  ): Promise<TraineeRow> {
    await this.refreshExpiredStatuses();

    const trainees =
      await this.dataSource.query(
        `
          SELECT
            id,
            academy_id,
            branch_id,
            first_name,
            last_name,
            email,
            portal_account_status
          FROM trainees
          WHERE
            id = $1
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [traineeId],
      ) as TraineeRow[];

    const trainee =
      trainees[0];

    if (!trainee) {
      throw new NotFoundException(
        'لم يتم العثور على المتدرب.',
      );
    }

    return trainee;
  }
}
