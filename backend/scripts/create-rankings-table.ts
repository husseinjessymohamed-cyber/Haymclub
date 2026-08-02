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
      "trainee_rankings" (
        "id" uuid PRIMARY KEY,
        "academy_id" uuid NOT NULL,
        "trainee_id" uuid NOT NULL,
        "updated_by_user_id" uuid NOT NULL,
        "points" integer NOT NULL
          DEFAULT 0,
        "note" varchar(500) NULL,
        "created_at" timestamptz NOT NULL
          DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL
          DEFAULT NOW(),
        "deleted_at" timestamptz NULL,

        CONSTRAINT
        "FK_trainee_rankings_academy"
        FOREIGN KEY ("academy_id")
        REFERENCES "academies"("id")
        ON DELETE CASCADE,

        CONSTRAINT
        "FK_trainee_rankings_trainee"
        FOREIGN KEY ("trainee_id")
        REFERENCES "trainees"("id")
        ON DELETE CASCADE,

        CONSTRAINT
        "FK_trainee_rankings_user"
        FOREIGN KEY ("updated_by_user_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE
      )
    `);

    await dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      "UQ_trainee_rankings_academy_trainee"
      ON "trainee_rankings"
      ("academy_id", "trainee_id")
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS
      "IDX_trainee_rankings_academy_points"
      ON "trainee_rankings"
      ("academy_id", "points" DESC)
    `);

    console.log(
      '✅ تم إنشاء جدول الترتيب',
    );
  } finally {
    await app.close();
  }
}

run().catch(
  (error: unknown) => {
    console.error(
      '❌ فشل إنشاء جدول الترتيب:',
      error,
    );

    process.exitCode = 1;
  },
);
