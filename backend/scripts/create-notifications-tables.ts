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
      "academy_notifications" (
        "id" uuid PRIMARY KEY,
        "academy_id" uuid NOT NULL,
        "branch_id" uuid NULL,
        "sender_user_id" uuid NOT NULL,
        "title" varchar(180) NOT NULL,
        "body" text NOT NULL,
        "audience" varchar(40) NOT NULL
          DEFAULT 'ALL_TRAINEES',
        "published_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL
          DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL
          DEFAULT NOW(),
        "deleted_at" timestamptz NULL,

        CONSTRAINT
        "FK_academy_notifications_academy"
        FOREIGN KEY ("academy_id")
        REFERENCES "academies"("id")
        ON DELETE CASCADE,

        CONSTRAINT
        "FK_academy_notifications_branch"
        FOREIGN KEY ("branch_id")
        REFERENCES "branches"("id")
        ON DELETE CASCADE,

        CONSTRAINT
        "FK_academy_notifications_sender"
        FOREIGN KEY ("sender_user_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE
      )
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS
      "IDX_academy_notifications_academy"
      ON "academy_notifications"
      ("academy_id")
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS
      "IDX_academy_notifications_branch"
      ON "academy_notifications"
      ("branch_id")
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS
      "IDX_academy_notifications_published"
      ON "academy_notifications"
      ("published_at")
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS
      "academy_notification_reads" (
        "id" uuid PRIMARY KEY,
        "notification_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "read_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL
          DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL
          DEFAULT NOW(),
        "deleted_at" timestamptz NULL,

        CONSTRAINT
        "FK_academy_notification_reads_notification"
        FOREIGN KEY ("notification_id")
        REFERENCES "academy_notifications"("id")
        ON DELETE CASCADE,

        CONSTRAINT
        "FK_academy_notification_reads_user"
        FOREIGN KEY ("user_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE
      )
    `);

    await dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      "UQ_academy_notification_reads_pair"
      ON "academy_notification_reads"
      ("notification_id", "user_id")
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS
      "IDX_academy_notification_reads_user"
      ON "academy_notification_reads"
      ("user_id")
    `);

    console.log(
      '✅ تم إنشاء جداول الإشعارات',
    );
  } finally {
    await app.close();
  }
}

run().catch(
  (error: unknown) => {
    console.error(
      '❌ فشل إنشاء جداول الإشعارات:',
      error,
    );

    process.exitCode = 1;
  },
);
