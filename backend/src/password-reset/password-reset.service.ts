import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  ConfigService,
} from '@nestjs/config';

import {
  createHash,
  randomBytes,
  randomUUID,
} from 'crypto';

import * as bcrypt from 'bcrypt';

import {
  DataSource,
} from 'typeorm';

import {
  MailService,
} from '../mail/mail.service';

import {
  ForgotPasswordDto,
} from './dto/forgot-password.dto';

import {
  ResetPasswordDto,
} from './dto/reset-password.dto';

interface UserRow {
  id: string;
  email: string;
}

interface ResetTokenRow {
  id: string;
  user_id: string;
  expires_at: string | Date;
  used_at: string | Date | null;
}

@Injectable()
export class PasswordResetService {
  private readonly logger =
    new Logger(
      PasswordResetService.name,
    );

  constructor(
    private readonly dataSource:
      DataSource,

    private readonly configService:
      ConfigService,

    private readonly mailService:
      MailService,
  ) {}

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{
    message: string;
  }> {
    const genericResponse = {
      message:
        'إذا كان البريد مسجلًا، سيتم إرسال رابط إعادة تعيين كلمة المرور.',
    };

    const email =
      dto.email
        .trim()
        .toLowerCase();

    const users =
      await this.dataSource.query(
        `
          SELECT
            id,
            email
          FROM users
          WHERE
            LOWER(email) =
              LOWER($1)
            AND deleted_at IS NULL
            AND status = 'ACTIVE'
          LIMIT 1
        `,
        [email],
      ) as UserRow[];

    const user =
      users[0];

    if (!user) {
      return genericResponse;
    }

    const recentTokens =
      await this.dataSource.query(
        `
          SELECT id
          FROM auth_password_reset_tokens
          WHERE
            user_id = $1
            AND used_at IS NULL
            AND deleted_at IS NULL
            AND created_at >
              NOW() - INTERVAL '60 seconds'
          LIMIT 1
        `,
        [user.id],
      ) as Array<{
        id: string;
      }>;

    if (recentTokens.length > 0) {
      return genericResponse;
    }

    const rawToken =
      randomBytes(32)
        .toString('hex');

    const tokenHash =
      this.hashToken(
        rawToken,
      );

    const expiresMinutes =
      this.getExpiresMinutes();

    const tokenId =
      randomUUID();

    await this.dataSource.transaction(
      async (manager) => {
        await manager.query(
          `
            UPDATE auth_password_reset_tokens
            SET
              used_at = NOW(),
              updated_at = NOW()
            WHERE
              user_id = $1
              AND used_at IS NULL
              AND deleted_at IS NULL
          `,
          [user.id],
        );

        await manager.query(
          `
            INSERT INTO
              auth_password_reset_tokens
            (
              id,
              user_id,
              token_hash,
              expires_at,
              created_at,
              updated_at
            )
            VALUES
            (
              $1,
              $2,
              $3,
              NOW() +
                ($4 * INTERVAL '1 minute'),
              NOW(),
              NOW()
            )
          `,
          [
            tokenId,
            user.id,
            tokenHash,
            expiresMinutes,
          ],
        );
      },
    );

    const resetUrl =
      this.buildResetUrl(
        rawToken,
      );

    try {
      await this.mailService
        .sendPasswordResetEmail(
          user.email,
          resetUrl,
          expiresMinutes,
        );
    } catch (error) {
      await this.dataSource.query(
        `
          DELETE FROM
            auth_password_reset_tokens
          WHERE id = $1
        `,
        [tokenId],
      );

      this.logger.error(
        `تعذر إرسال بريد إعادة التعيين إلى ${user.email}`,
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }

    return genericResponse;
  }

  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<{
    message: string;
  }> {
    const tokenHash =
      this.hashToken(
        dto.token.trim(),
      );

    await this.dataSource.transaction(
      async (manager) => {
        const tokens =
          await manager.query(
            `
              SELECT
                id,
                user_id,
                expires_at,
                used_at
              FROM auth_password_reset_tokens
              WHERE
                token_hash = $1
                AND deleted_at IS NULL
              LIMIT 1
              FOR UPDATE
            `,
            [tokenHash],
          ) as ResetTokenRow[];

        const token =
          tokens[0];

        if (
          !token ||
          token.used_at
        ) {
          throw new BadRequestException(
            'رابط إعادة تعيين كلمة المرور غير صالح أو تم استخدامه.',
          );
        }

        const expiresAt =
          new Date(
            token.expires_at,
          );

        if (
          Number.isNaN(
            expiresAt.getTime(),
          ) ||
          expiresAt.getTime() <
            Date.now()
        ) {
          throw new BadRequestException(
            'انتهت صلاحية رابط إعادة تعيين كلمة المرور.',
          );
        }

        const passwordHash =
          await bcrypt.hash(
            dto.password,
            12,
          );

        const updatedUsers =
          await manager.query(
            `
              UPDATE users
              SET
                password_hash = $1,
                updated_at = NOW()
              WHERE
                id = $2
                AND deleted_at IS NULL
                AND status = 'ACTIVE'
              RETURNING id
            `,
            [
              passwordHash,
              token.user_id,
            ],
          ) as Array<{
            id: string;
          }>;

        if (
          updatedUsers.length === 0
        ) {
          throw new BadRequestException(
            'تعذر تحديث كلمة المرور لهذا الحساب.',
          );
        }

        await manager.query(
          `
            UPDATE auth_password_reset_tokens
            SET
              used_at = NOW(),
              updated_at = NOW()
            WHERE id = $1
          `,
          [token.id],
        );

        await manager.query(
          `
            UPDATE auth_password_reset_tokens
            SET
              used_at =
                COALESCE(
                  used_at,
                  NOW()
                ),
              updated_at = NOW()
            WHERE
              user_id = $1
              AND id <> $2
              AND used_at IS NULL
          `,
          [
            token.user_id,
            token.id,
          ],
        );
      },
    );

    return {
      message:
        'تم إنشاء كلمة المرور الجديدة بنجاح.',
    };
  }

  private hashToken(
    token: string,
  ): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  private getExpiresMinutes():
  number {
    const configured =
      Number(
        this.configService
          .get<string>(
            'PASSWORD_RESET_EXPIRES_MINUTES',
          ) ?? '30',
      );

    if (
      Number.isNaN(configured) ||
      configured < 5
    ) {
      return 30;
    }

    return Math.min(
      configured,
      1440,
    );
  }

  private buildResetUrl(
    token: string,
  ): string {
    const configuredBaseUrl =
      this.configService.get<string>(
        'PASSWORD_RESET_BASE_URL',
      ) ||
      this.configService.get<string>(
        'FRONTEND_URL',
      ) ||
      'http://localhost:5173';

    const baseUrl =
      configuredBaseUrl
        .replace(/\/+$/, '');

    return (
      `${baseUrl}/?resetToken=` +
      encodeURIComponent(token)
    );
  }
}
