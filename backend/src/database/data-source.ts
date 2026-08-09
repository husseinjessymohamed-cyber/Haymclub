import 'reflect-metadata';

import {
  DataSource,
} from 'typeorm';

import {
  config as loadEnv,
} from 'dotenv';

import {
  join,
} from 'node:path';

/*
 * CLI DataSource فقط.
 * لا يستخدم synchronize نهائيا.
 */

loadEnv({
  path:
    process.env.ENV_FILE ??
    '.env.local',
});

loadEnv({
  path: '.env',
});

export default new DataSource({
  type: 'postgres',

  host:
    process.env.DB_HOST,

  port:
    Number(
      process.env.DB_PORT ??
      5432,
    ),

  username:
    process.env.DB_USERNAME,

  password:
    process.env.DB_PASSWORD,

  database:
    process.env.DB_NAME,

  /*
   * مهم:
   * الـ migrations هي المسؤولة عن schema.
   */
  synchronize: false,

  logging: false,

  entities: [
    join(
      __dirname,
      '..',
      '**',
      '*.entity.{ts,js}',
    ),
  ],

  migrations: [
    join(
      __dirname,
      'migrations',
      '*.{ts,js}',
    ),
  ],

  migrationsTableName:
    'typeorm_migrations',
});
