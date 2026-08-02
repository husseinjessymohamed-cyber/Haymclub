import {
  NestFactory,
} from '@nestjs/core';

import {
  DataSource,
} from 'typeorm';

import {
  AppModule,
} from '../src/app.module';

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
      "auth_password_reset_tokens" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64)
          NOT NULL,
        "expires_at" timestamptz
          NOT NULL,
        "used_at" timestamptz NULL,
        "created_at" timestamptz
          NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz
          NOT NULL DEFAULT NOW(),
        "deleted_at" timestamptz NULL,

        CONSTRAINT
        "FK_auth_password_reset_user"
        FOREIGN KEY ("user_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE
      )
    `);

    await dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      "UQ_auth_password_reset_token_hash"
      ON "auth_password_reset_tokens"
      ("token_hash")
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS
      "IDX_auth_password_reset_user"
      ON "auth_password_reset_tokens"
      ("user_id")
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS
      "IDX_auth_password_reset_expiry"
      ON "auth_password_reset_tokens"
      ("expires_at")
    `);

    console.log(
      '✅ تم إنشاء جدول رموز استعادة كلمة المرور',
    );
  } finally {
    await app.close();
  }
}

run().catch(
  (error: unknown) => {
    console.error(
      '❌ فشل إنشاء الجدول:',
      error,
    );

    process.exitCode = 1;
  },
);
