import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

import {
  readFileSync,
} from 'node:fs';

import {
  join,
} from 'node:path';

export class InitialHaymclubBaseline1786236979195
  implements MigrationInterface
{
  name = 'InitialHaymclubBaseline1786236979195';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const sqlPath =
      join(
        __dirname,
        'sql',
        '1786236979195-initial-haymclub-baseline.sql',
      );

    const sql =
      readFileSync(
        sqlPath,
        'utf8',
      );

    await queryRunner.query(sql);
  }

  public async down(
    _queryRunner: QueryRunner,
  ): Promise<void> {
    throw new Error(
      'Initial baseline rollback is disabled. Restore the database backup instead.',
    );
  }
}
