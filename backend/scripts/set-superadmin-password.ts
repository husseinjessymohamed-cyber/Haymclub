import '../src/config/load-env';

import {
  readFileSync,
  unlinkSync,
} from 'fs';

import * as bcrypt from 'bcrypt';

import {
  NestFactory,
} from '@nestjs/core';

import {
  DataSource,
} from 'typeorm';

import {
  AppModule,
} from '../src/app.module';

interface SuperAdminRow {
  id: string;
  email: string;
}

async function run(): Promise<void> {
  const passwordFile =
    '/tmp/haymclub-new-superadmin-password.txt';

  const password =
    readFileSync(
      passwordFile,
      'utf8',
    ).trim();

  if (password.length < 8) {
    throw new Error(
      'كلمة المرور يجب ألا تقل عن 8 أحرف.',
    );
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error(
      'كلمة المرور يجب أن تحتوي حرفًا كبيرًا.',
    );
  }

  if (!/[a-z]/.test(password)) {
    throw new Error(
      'كلمة المرور يجب أن تحتوي حرفًا صغيرًا.',
    );
  }

  if (!/[0-9]/.test(password)) {
    throw new Error(
      'كلمة المرور يجب أن تحتوي رقمًا.',
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

    const users =
      await dataSource.query(
        `
          SELECT DISTINCT
            u.id,
            u.email
          FROM users u
          INNER JOIN academy_memberships m
            ON m.user_id = u.id
          WHERE
            m.role = 'SUPER_ADMIN'
            AND m.is_active = TRUE
            AND u.deleted_at IS NULL
          ORDER BY u.email
          LIMIT 1
        `,
      ) as SuperAdminRow[];

    const user = users[0];

    if (!user) {
      throw new Error(
        'لم يتم العثور على حساب SUPER_ADMIN.',
      );
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12,
      );

    await dataSource.query(
      `
        UPDATE users
        SET
          password_hash = $1,
          status = 'ACTIVE',
          updated_at = NOW()
        WHERE id = $2
      `,
      [
        passwordHash,
        user.id,
      ],
    );

    console.log(
      '✅ تم تغيير كلمة مرور السوبر أدمن بنجاح',
    );

    console.log(
      `البريد: ${user.email}`,
    );
  } finally {
    await app.close();

    try {
      unlinkSync(passwordFile);
    } catch {
      // الملف محذوف بالفعل.
    }
  }
}

run().catch(
  (error: unknown) => {
    console.error(
      '❌ فشل تغيير كلمة المرور:',
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
