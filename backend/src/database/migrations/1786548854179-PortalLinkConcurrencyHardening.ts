import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

// HAYMCLUB_PORTAL_CONCURRENCY_DB_V1
export class PortalLinkConcurrencyHardening1786548854179
  implements MigrationInterface
{
  name =
    'PortalLinkConcurrencyHardening1786548854179';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    // Do not silently repair ambiguous production data.
    // Refuse the migration if legacy duplicates exist.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT
            trainee_id
          FROM
            portal_trainee_links
          WHERE
            relationship = 'SELF'
            AND deleted_at IS NULL
          GROUP BY
            trainee_id
          HAVING
            COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION
            'Duplicate active SELF portal links exist';
        END IF;

        IF EXISTS (
          SELECT
            user_id
          FROM
            portal_trainee_links
          WHERE
            is_primary = true
            AND deleted_at IS NULL
          GROUP BY
            user_id
          HAVING
            COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION
            'Duplicate primary portal links exist';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX
      IF NOT EXISTS
        "UQ_portal_links_single_self_per_trainee"
      ON
        "portal_trainee_links" ("trainee_id")
      WHERE
        "relationship" = 'SELF'
        AND "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX
      IF NOT EXISTS
        "UQ_portal_links_single_primary_per_user"
      ON
        "portal_trainee_links" ("user_id")
      WHERE
        "is_primary" = true
        AND "deleted_at" IS NULL
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "UQ_portal_links_single_primary_per_user"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "UQ_portal_links_single_self_per_trainee"
    `);
  }
}
