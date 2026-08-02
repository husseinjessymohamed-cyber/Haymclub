import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';

async function run(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  try {
    const dataSource = app.get(DataSource);

    const existingUsers = await dataSource.query(
      `
        SELECT id, email, status
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email],
    );

    if (!Array.isArray(existingUsers) || existingUsers.length === 0) {
      throw new Error(`لم يتم العثور على الحساب: ${email}`);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await dataSource.query(
      `
        UPDATE users
        SET
          password_hash = $1,
          status = 'ACTIVE',
          deleted_at = NULL,
          updated_at = NOW()
        WHERE LOWER(email) = LOWER($2)
      `,
      [passwordHash, email],
    );

    const verifiedUsers = await dataSource.query(
      `
        SELECT id, email, status
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email],
    );

    const verifiedUser = Array.isArray(verifiedUsers)
      ? verifiedUsers[0]
      : null;

    if (!verifiedUser) {
      throw new Error('تعذر التحقق من تحديث الحساب');
    }

    console.log('✅ تم تحديث حساب الأدمن');
    console.log(`Email: ${verifiedUser.email}`);
    console.log(`Status: ${verifiedUser.status}`);
  } finally {
    await app.close();
  }
}

run().catch((error: unknown) => {
  console.error(
    '❌ فشل التحديث:',
    error instanceof Error ? error.message : error,
  );

  process.exitCode = 1;
});
