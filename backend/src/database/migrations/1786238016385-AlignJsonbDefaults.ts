import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignJsonbDefaults1786238016385 implements MigrationInterface {
    name = 'AlignJsonbDefaults1786238016385'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "super_admin_audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "saas_plans" ALTER COLUMN "features" SET DEFAULT '{}'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "saas_plans" ALTER COLUMN "features" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "super_admin_audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
    }

}
