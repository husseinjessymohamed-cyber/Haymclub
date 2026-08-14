import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';

import { AppModule } from './../src/app.module';
import { WorkflowAutomationService } from './../src/workflow/workflow-automation.service';

const IDS = {
  academyA: '10000000-0000-4000-8000-000000000001',
  academyB: '10000000-0000-4000-8000-000000000002',

  branchA: '11000000-0000-4000-8000-000000000001',
  branchB: '11000000-0000-4000-8000-000000000002',

  adminA: '20000000-0000-4000-8000-000000000001',
  sharedUser: '20000000-0000-4000-8000-000000000002',
  parent: '20000000-0000-4000-8000-000000000003',
  bOnlyUser: '20000000-0000-4000-8000-000000000004',

  traineeA: '30000000-0000-4000-8000-000000000001',
  traineeB: '30000000-0000-4000-8000-000000000002',
} as const;

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let jwtService: JwtService;

  let adminAToken: string;
  let parentAToken: string;

  beforeAll(async () => {
    if (process.env.DB_NAME !== 'haymclub_tenant_e2e') {
      throw new Error(
        `REFUSING TENANT E2E: DB_NAME must be haymclub_tenant_e2e, got ${
          process.env.DB_NAME ?? '<unset>'
        }`,
      );
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WorkflowAutomationService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api');

    await app.init();

    dataSource = app.get(DataSource);
    jwtService = app.get(JwtService);

    await seedFixtures();

    adminAToken = await jwtService.signAsync({
      sub: IDS.adminA,
      email: 'phase3.admin.a@example.invalid',
      academyId: IDS.academyA,
      branchId: IDS.branchA,
      role: 'ACADEMY_ADMIN',
    });

    parentAToken = await jwtService.signAsync({
      sub: IDS.parent,
      email: 'phase3.parent@example.invalid',
      academyId: IDS.academyA,
      branchId: IDS.branchA,
      role: 'PARENT',
    });
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        'TRUNCATE TABLE academies, users RESTART IDENTITY CASCADE',
      );
    }

    if (app) {
      await app.close();
    }
  });

  async function seedFixtures(): Promise<void> {
    await dataSource.query(
      'TRUNCATE TABLE academies, users RESTART IDENTITY CASCADE',
    );

    await dataSource.query(
      `
        INSERT INTO academies
          (id, name, slug)
        VALUES
          ($1, 'Tenant Academy A', 'tenant-e2e-a'),
          ($2, 'Tenant Academy B', 'tenant-e2e-b')
      `,
      [IDS.academyA, IDS.academyB],
    );

    await dataSource.query(
      `
        INSERT INTO branches
          (
            id,
            academy_id,
            name,
            code,
            is_main,
            is_active
          )
        VALUES
          (
            $1,
            $2,
            'Branch A',
            'E2E-A',
            TRUE,
            TRUE
          ),
          (
            $3,
            $4,
            'Branch B',
            'E2E-B',
            TRUE,
            TRUE
          )
      `,
      [IDS.branchA, IDS.academyA, IDS.branchB, IDS.academyB],
    );

    await dataSource.query(
      `
        INSERT INTO users
          (
            id,
            first_name,
            last_name,
            email,
            password_hash,
            status
          )
        VALUES
          (
            $1,
            'Admin',
            'Academy A',
            'phase3.admin.a@example.invalid',
            'unused-e2e-password-hash',
            'ACTIVE'
          ),
          (
            $2,
            'Shared',
            'User',
            'phase3.shared@example.invalid',
            'unused-e2e-password-hash',
            'ACTIVE'
          ),
          (
            $3,
            'Parent',
            'Cross Academy',
            'phase3.parent@example.invalid',
            'unused-e2e-password-hash',
            'ACTIVE'
          ),
          (
            $4,
            'Academy B',
            'Only User',
            'phase3.b-only@example.invalid',
            'unused-e2e-password-hash',
            'ACTIVE'
          )
      `,
      [IDS.adminA, IDS.sharedUser, IDS.parent, IDS.bOnlyUser],
    );

    await dataSource.query(
      `
        INSERT INTO academy_memberships
          (
            user_id,
            academy_id,
            branch_id,
            role,
            is_primary,
            is_active
          )
        VALUES
          (
            $1,
            $2,
            $3,
            'ACADEMY_ADMIN',
            TRUE,
            TRUE
          ),
          (
            $4,
            $2,
            $3,
            'COACH',
            TRUE,
            TRUE
          ),
          (
            $4,
            $5,
            $6,
            'ACCOUNTANT',
            FALSE,
            TRUE
          ),
          (
            $7,
            $2,
            $3,
            'PARENT',
            TRUE,
            TRUE
          ),
          (
            $7,
            $5,
            $6,
            'PARENT',
            FALSE,
            TRUE
          ),
          (
            $8,
            $5,
            $6,
            'COACH',
            TRUE,
            TRUE
          )
      `,
      [
        IDS.adminA,
        IDS.academyA,
        IDS.branchA,
        IDS.sharedUser,
        IDS.academyB,
        IDS.branchB,
        IDS.parent,
        IDS.bOnlyUser,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO trainees
          (
            id,
            academy_id,
            branch_id,
            registration_code,
            first_name,
            last_name,
            date_of_birth,
            gender
          )
        VALUES
          (
            $1,
            $2,
            $3,
            'E2E-A-TRAINEE',
            'Trainee',
            'Academy A',
            '2012-01-01',
            'MALE'
          ),
          (
            $4,
            $5,
            $6,
            'E2E-B-TRAINEE',
            'Trainee',
            'Academy B',
            '2012-01-01',
            'MALE'
          )
      `,
      [
        IDS.traineeA,
        IDS.academyA,
        IDS.branchA,
        IDS.traineeB,
        IDS.academyB,
        IDS.branchB,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO portal_trainee_links
          (
            academy_id,
            user_id,
            trainee_id,
            relationship,
            is_primary,
            is_active
          )
        VALUES
          (
            $1,
            $2,
            $3,
            'PARENT',
            TRUE,
            TRUE
          ),
          (
            $4,
            $2,
            $5,
            'PARENT',
            FALSE,
            TRUE
          )
      `,
      [IDS.academyA, IDS.parent, IDS.traineeA, IDS.academyB, IDS.traineeB],
    );
  }

  it('scopes shared user memberships to the active academy', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/users/${IDS.sharedUser}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    expect(response.body.memberships).toHaveLength(1);

    expect(response.body.memberships[0].academyId).toBe(IDS.academyA);

    expect(JSON.stringify(response.body)).not.toContain(IDS.academyB);
  });

  it('blocks access to a user belonging only to another academy', async () => {
    await request(app.getHttpServer())
      .get(`/api/users/${IDS.bOnlyUser}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(403);
  });

  it('blocks portal schedule access across academies', async () => {
    await request(app.getHttpServer())
      .get(`/api/portal/trainees/${IDS.traineeB}/schedule`)
      .set('Authorization', `Bearer ${parentAToken}`)
      .expect(403);
  });

  it('keeps same-academy portal schedule access working', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/portal/trainees/${IDS.traineeA}/schedule`)
      .set('Authorization', `Bearer ${parentAToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
