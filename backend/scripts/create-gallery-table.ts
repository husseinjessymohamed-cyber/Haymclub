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
      "academy_gallery_items" (
        "id" uuid PRIMARY KEY,
        "academy_id" uuid NOT NULL,
        "uploaded_by_user_id" uuid NOT NULL,
        "title" varchar(180) NOT NULL,
        "description" text NULL,
        "media_type" varchar(20) NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "original_name" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "size" integer NOT NULL,
        "published_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL
          DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL
          DEFAULT NOW(),
        "deleted_at" timestamptz NULL,

        CONSTRAINT
        "FK_gallery_items_academy"
        FOREIGN KEY ("academy_id")
        REFERENCES "academies"("id")
        ON DELETE CASCADE,

        CONSTRAINT
        "FK_gallery_items_user"
        FOREIGN KEY ("uploaded_by_user_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE
      )
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS
      "IDX_gallery_items_academy"
      ON "academy_gallery_items"
      ("academy_id")
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS
      "IDX_gallery_items_published"
      ON "academy_gallery_items"
      ("published_at")
    `);

    console.log(
      '✅ تم إنشاء جدول المعرض',
    );
  } finally {
    await app.close();
  }
}

run().catch(
  (error: unknown) => {
    console.error(
      '❌ فشل إنشاء جدول المعرض:',
      error,
    );

    process.exitCode = 1;
  },
);
