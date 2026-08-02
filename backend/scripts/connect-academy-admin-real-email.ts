import '../src/config/load-env';

import {
  NestFactory,
} from '@nestjs/core';

import {
  DataSource,
} from 'typeorm';

import {
  AppModule,
} from '../src/app.module';

import {
  PasswordResetService,
} from '../src/password-reset/password-reset.service';

interface UserRow {
  id: string;
  email: string;
}

async function run(): Promise<void> {
  const realEmail =
    process.env.SMTP_TEST_TO
      ?.trim()
      .toLowerCase();

  if (
    !realEmail ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/
      .test(realEmail)
  ) {
    throw new Error(
      'SMTP_TEST_TO غير مضبوط ببريد صحيح.',
    );
  }

  const app =
    await NestFactory
      .createApplicationContext(
        AppModule,
        {
          logger: ['error'],
        },
      );

  try {
    const dataSource =
      app.get(DataSource);

    const passwordResetService =
      app.get(
        PasswordResetService,
      );

    const admins =
      await dataSource.query(
        `
          SELECT DISTINCT
            u.id,
            u.email
          FROM users u
          INNER JOIN academy_memberships m
            ON m.user_id = u.id
          WHERE
            m.role = 'ACADEMY_ADMIN'
            AND m.is_active = TRUE
            AND u.deleted_at IS NULL
          ORDER BY
            u.email ASC
          LIMIT 1
        `,
      ) as UserRow[];

    const admin =
      admins[0];

    if (!admin) {
      throw new Error(
        'لم يتم العثور على حساب ACADEMY_ADMIN.',
      );
    }

    const conflicts =
      await dataSource.query(
        `
          SELECT
            id,
            email
          FROM users
          WHERE
            LOWER(email) = LOWER($1)
            AND id <> $2
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [
          realEmail,
          admin.id,
        ],
      ) as UserRow[];

    if (conflicts.length > 0) {
      throw new Error(
        'البريد الحقيقي مستخدم بالفعل في حساب آخر.',
      );
    }

    await dataSource.query(
      `
        UPDATE users
        SET
          email = $1,
          status = 'ACTIVE',
          updated_at = NOW()
        WHERE id = $2
      `,
      [
        realEmail,
        admin.id,
      ],
    );

    await passwordResetService
      .forgotPassword({
        email: realEmail,
      });

    const atIndex =
      realEmail.indexOf('@');

    const maskedEmail =
      realEmail.slice(0, 2) +
      '***' +
      realEmail.slice(atIndex);

    console.log(
      '✅ تم ربط حساب إدارة الأكاديمية بالبريد الحقيقي',
    );

    console.log(
      `البريد: ${maskedEmail}`,
    );

    console.log(
      '✅ تم طلب إرسال رابط إنشاء كلمة مرور جديدة',
    );

    console.log(
      'افحص Inbox وSpam.',
    );
  } finally {
    await app.close();
  }
}

run().catch(
  (error: unknown) => {
    console.error(
      '❌ فشل الربط:',
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
