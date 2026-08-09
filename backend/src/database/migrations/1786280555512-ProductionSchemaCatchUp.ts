import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductionSchemaCatchUp1786280555512 implements MigrationInterface {
  name = 'ProductionSchemaCatchUp1786280555512';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.auth_password_reset_tokens (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        token_hash character varying(64) NOT NULL,
        expires_at timestamp with time zone NOT NULL,
        used_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL,
        deleted_at timestamp with time zone,
        CONSTRAINT auth_password_reset_tokens_pkey PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_password_reset_expiry"
      ON public.auth_password_reset_tokens (expires_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_password_reset_user"
      ON public.auth_password_reset_tokens (user_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_auth_password_reset_token_hash"
      ON public.auth_password_reset_tokens (token_hash)
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_auth_password_reset_user'
          AND conrelid = 'public.auth_password_reset_tokens'::regclass
        ) THEN
          ALTER TABLE public.auth_password_reset_tokens
          ADD CONSTRAINT "FK_auth_password_reset_user"
          FOREIGN KEY (user_id)
          REFERENCES public.users(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE public.academies
      ADD COLUMN IF NOT EXISTS attendance_enabled boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE public.academies
      ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE public.academies
      ADD COLUMN IF NOT EXISTS rankings_enabled boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE public.academies
      ADD COLUMN IF NOT EXISTS gallery_enabled boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE public.academies
      ADD COLUMN IF NOT EXISTS subscriptions_enabled boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE public.academies
      ADD COLUMN IF NOT EXISTS reports_enabled boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'trainee_portal_account_status_enum'
          AND n.nspname = 'public'
        ) THEN
          CREATE TYPE public.trainee_portal_account_status_enum AS ENUM (
            'NOT_CREATED',
            'PENDING_APPROVAL',
            'INVITATION_SENT',
            'ACTIVE',
            'EXPIRED',
            'REJECTED'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE public.trainees
      ADD COLUMN IF NOT EXISTS portal_account_status
      public.trainee_portal_account_status_enum
      NOT NULL DEFAULT 'NOT_CREATED'
    `);

    await queryRunner.query(`
      ALTER TABLE public.trainees
      ADD COLUMN IF NOT EXISTS portal_approved_at timestamp with time zone
    `);

    await queryRunner.query(`
      ALTER TABLE public.trainees
      ADD COLUMN IF NOT EXISTS portal_rejected_at timestamp with time zone
    `);

    await queryRunner.query(`
      ALTER TABLE public.trainees
      ADD COLUMN IF NOT EXISTS portal_invitation_sent_at timestamp with time zone
    `);

    await queryRunner.query(`
      ALTER TABLE public.trainees
      ADD COLUMN IF NOT EXISTS portal_invitation_expires_at timestamp with time zone
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'ProductionSchemaCatchUp rollback is disabled. Restore a database backup instead.',
    );
  }
}
