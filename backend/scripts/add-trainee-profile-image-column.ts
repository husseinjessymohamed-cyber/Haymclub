import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(
    AppModule,
    {
      logger: ['error'],
    },
  );

  try {
    const dataSource = app.get(DataSource);

    await dataSource.query(`
      ALTER TABLE "trainees"
      ADD COLUMN IF NOT EXISTS
      "profile_image_url" varchar(500)
    `);

    const result = await dataSource.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'trainees'
        AND column_name = 'profile_image_url'
    `);

    console.log(
      '✅ تم إضافة عمود profile_image_url إلى قاعدة البيانات',
    );

    console.log(result);
  } finally {
    await app.close();
  }
}

run().catch((error: unknown) => {
  console.error(
    '❌ فشل تحديث قاعدة البيانات:',
    error,
  );

  process.exitCode = 1;
});
