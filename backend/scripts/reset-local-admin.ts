import '../src/config/load-env';

import {
  NestFactory,
} from '@nestjs/core';

import {
  DataSource,
} from 'typeorm';

import * as bcrypt from 'bcrypt';

import {
  AppModule,
} from '../src/app.module';

async function run(): Promise<void> {
  const email =
    process.env.ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

  const password =
    process.env.ADMIN_NEW_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Admin credentials are missing',
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
          SELECT
            id,
            email,
            status
          FROM users
          WHERE
            LOWER(email) =
              LOWER($1)
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [email],
      ) as Array<{
        id: string;
        email: string;
        status: string;
      }>;

    const user = users[0];

    if (!user) {
      throw new Error(
        `Admin user not found: ${email}`,
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
      '✅ تم تفعيل حساب الأدمن وتغيير كلمة المرور',
    );

    console.log(
      `Admin email: ${user.email}`,
    );
  } finally {
    await app.close();
  }
}

run().catch(
  (error: unknown) => {
    console.error(
      '❌ فشل تحديث حساب الأدمن:',
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
