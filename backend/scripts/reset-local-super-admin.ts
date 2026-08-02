import '../src/config/load-env';

import { writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';

interface SuperAdminRow {
  id: string;
  email: string;
  phone: string | null;
}

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(
    AppModule,
    {
      logger: ['error'],
    },
  );

  try {
    const dataSource = app.get(DataSource);

    let users = await dataSource.query(
      `
        SELECT DISTINCT
          u.id,
          u.email,
          u.phone
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

    if (users.length === 0) {
      users = await dataSource.query(
        `
          SELECT
            id,
            email,
            phone
          FROM users
          WHERE
            deleted_at IS NULL
            AND LOWER(email) LIKE '%superadmin%'
          ORDER BY email
          LIMIT 1
        `,
      ) as SuperAdminRow[];
    }

    const user = users[0];

    if (!user) {
      throw new Error(
        'لم يتم العثور على حساب SUPER_ADMIN في قاعدة البيانات.',
      );
    }

    const password =
      `Ha9!${randomBytes(12).toString('base64url')}`;

    const passwordHash =
      await bcrypt.hash(password, 12);

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

    const file =
      '/tmp/haymclub-super-admin-login.txt';

    writeFileSync(
      file,
      [
        `Email: ${user.email}`,
        `Phone: ${user.phone ?? 'غير مسجل'}`,
        `Password: ${password}`,
        '',
      ].join('\n'),
      {
        encoding: 'utf-8',
        mode: 0o600,
      },
    );

    console.log(
      '✅ تم تفعيل حساب السوبر أدمن وإعادة تعيين كلمة المرور',
    );

    console.log(
      `✅ تم حفظ بيانات الدخول في: ${file}`,
    );
  } finally {
    await app.close();
  }
}

run().catch((error: unknown) => {
  console.error(
    '❌ فشل إعادة تعيين السوبر أدمن:',
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
});
