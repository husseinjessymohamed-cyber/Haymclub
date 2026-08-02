import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';

async function run(): Promise<void> {
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

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS
      "password_reset_tokens" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),

        CONSTRAINT
        "FK_password_reset_tokens_user"
        FOREIGN KEY ("user_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE,

        CONSTRAINT
        "UQ_password_reset_tokens_token_hash"
        UNIQUE ("token_hash")
      )
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS
      "IDX_password_reset_tokens_user_id"
      ON "password_reset_tokens" ("user_id")
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS
      "IDX_password_reset_tokens_expires_at"
      ON "password_reset_tokens" ("expires_at")
    `);

    console.log(
      '✅ تم إنشاء جدول password_reset_tokens',
    );
  } finally {
    await app.close();
  }
}

run().catch((error: unknown) => {
  console.error(
    '❌ فشل إنشاء جدول استعادة كلمة المرور',
    error,
  );

  process.exitCode = 1;
});
