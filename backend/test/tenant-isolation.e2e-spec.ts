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
  branchA2: '11000000-0000-4000-8000-000000000003',
  branchB: '11000000-0000-4000-8000-000000000002',

  adminA: '20000000-0000-4000-8000-000000000001',
  sharedUser: '20000000-0000-4000-8000-000000000002',
  parent: '20000000-0000-4000-8000-000000000003',
  bOnlyUser: '20000000-0000-4000-8000-000000000004',

  traineeA: '30000000-0000-4000-8000-000000000001',
  traineeA2: '30000000-0000-4000-8000-000000000003',
  traineeB: '30000000-0000-4000-8000-000000000002',
} as const;

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let jwtService: JwtService;

  let adminAToken: string;
  let parentAToken: string;
  let branchManagerA1Token: string;
  let branchManagerNoBranchToken: string;
  let superAdminToken: string;

  let branchA1TaskId: string;
  let branchA2TaskId: string;
  let branchBTaskId: string;

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

    branchManagerA1Token = await jwtService.signAsync({
      sub: IDS.adminA,
      email: 'phase4.branch.a1@example.invalid',
      academyId: IDS.academyA,
      branchId: IDS.branchA,
      role: 'BRANCH_MANAGER',
    });

    branchManagerNoBranchToken = await jwtService.signAsync({
      sub: IDS.adminA,
      email: 'phase4.branch.null@example.invalid',
      academyId: IDS.academyA,
      branchId: null,
      role: 'BRANCH_MANAGER',
    });

    superAdminToken = await jwtService.signAsync({
      sub: IDS.adminA,
      email: 'phase4.super@example.invalid',
      academyId: null,
      branchId: null,
      role: 'SUPER_ADMIN',
    });

    const taskA1 = await request(app.getHttpServer())
      .post("/api/workflow/tasks")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        branchId: IDS.branchA,
        taskType: "PHASE4_A1_TEST",
        title: "Phase 4 branch A1 task",
      })
      .expect(201);
    branchA1TaskId = taskA1.body.id;

    const taskA2 = await request(app.getHttpServer())
      .post("/api/workflow/tasks")
      .set("Authorization", `Bearer ${adminAToken}`)
      .send({
        branchId: IDS.branchA2,
        taskType: "PHASE4_A2_TEST",
        title: "Phase 4 branch A2 task",
      })
      .expect(201);
    branchA2TaskId = taskA2.body.id;

    const taskB = await request(app.getHttpServer())
      .post("/api/workflow/tasks")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        academyId: IDS.academyB,
        branchId: IDS.branchB,
        taskType: "PHASE4_B_TEST",
        title: "Phase 4 academy B task",
      })
      .expect(201);
    branchBTaskId = taskB.body.id;
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
        INSERT INTO branches
          (id, academy_id, name, code, is_main, is_active)
        VALUES
          ($1, $2, 'Branch A2', 'E2E-A2', FALSE, TRUE)
      `,
      [IDS.branchA2, IDS.academyA],
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
        INSERT INTO trainees
          (id, academy_id, branch_id, registration_code, first_name, last_name, date_of_birth, gender)
        VALUES
          ($1, $2, $3, 'E2E-A2-TRAINEE', 'Trainee', 'Branch A2', '2012-01-01', 'MALE')
      `,
      [IDS.traineeA2, IDS.academyA, IDS.branchA2],
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

  it("fails closed when a branch manager has no branch context", async () => {
    await request(app.getHttpServer())
      .get("/api/trainees")
      .set("Authorization", `Bearer ${branchManagerNoBranchToken}`)
      .expect(403);
  });

  it("scopes trainee listing to the active branch", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/trainees")
      .set("Authorization", `Bearer ${branchManagerA1Token}`)
      .expect(200);

    const body = JSON.stringify(response.body);
    expect(body).toContain("E2E-A-TRAINEE");
    expect(body).not.toContain("E2E-A2-TRAINEE");
  });

  it("scopes workflow tasks to the active branch", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/workflow/tasks")
      .set("Authorization", `Bearer ${branchManagerA1Token}`)
      .expect(200);

    const ids = response.body.map((task: { id: string }) => task.id);
    expect(ids).toContain(branchA1TaskId);
    expect(ids).not.toContain(branchA2TaskId);
    expect(ids).not.toContain(branchBTaskId);
  });

  it("forces branch-scoped task creation onto the token branch", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/workflow/tasks")
      .set("Authorization", `Bearer ${branchManagerA1Token}`)
      .send({
        branchId: IDS.branchA2,
        taskType: "PHASE4_OVERRIDE_TEST",
        title: "Attempted cross-branch task",
      })
      .expect(201);

    expect(response.body.branch_id).toBe(IDS.branchA);
    expect(response.body.branch_id).not.toBe(IDS.branchA2);
  });

  it("blocks cross-branch workflow task mutation", async () => {
    await request(app.getHttpServer())
      .patch(`/api/workflow/tasks/${branchA2TaskId}/status`)
      .set("Authorization", `Bearer ${branchManagerA1Token}`)
      .send({ status: "IN_PROGRESS" })
      .expect(403);
  });

  it("blocks branch managers from academy-wide workflow sync", async () => {
    await request(app.getHttpServer())
      .post("/api/workflow/sync")
      .set("Authorization", `Bearer ${branchManagerA1Token}`)
      .expect(403);
  });

  it("keeps academy admins academy-wide", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/workflow/tasks")
      .set("Authorization", `Bearer ${adminAToken}`)
      .expect(200);

    const ids = response.body.map((task: { id: string }) => task.id);
    expect(ids).toContain(branchA1TaskId);
    expect(ids).toContain(branchA2TaskId);
    expect(ids).not.toContain(branchBTaskId);
  });

  it("keeps super admins global", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/workflow/tasks")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .expect(200);

    const ids = response.body.map((task: { id: string }) => task.id);
    expect(ids).toContain(branchA1TaskId);
    expect(ids).toContain(branchA2TaskId);
    expect(ids).toContain(branchBTaskId);
  });

  it('fails closed when a notification admin has no branch context', async () => {
    await request(app.getHttpServer())
      .post('/api/notifications')
      .set('Authorization', `Bearer ${branchManagerNoBranchToken}`)
      .send({
        title: 'Phase 5 no branch',
        body: 'Should be rejected',
        audience: 'BRANCH_TRAINEES',
        branchId: IDS.branchA,
      })
      .expect(403);
  });

  it('blocks branch-scoped admins from academy-wide notifications', async () => {
    await request(app.getHttpServer())
      .post('/api/notifications')
      .set('Authorization', `Bearer ${branchManagerA1Token}`)
      .send({
        title: 'Phase 5 academy wide attempt',
        body: 'Should be rejected',
        audience: 'ALL_TRAINEES',
      })
      .expect(403);
  });

  it('blocks cross-branch notification creation', async () => {
    await request(app.getHttpServer())
      .post('/api/notifications')
      .set('Authorization', `Bearer ${branchManagerA1Token}`)
      .send({
        title: 'Phase 5 cross branch attempt',
        body: 'Should be rejected',
        audience: 'BRANCH_TRAINEES',
        branchId: IDS.branchA2,
      })
      .expect(403);
  });

  it('allows branch-scoped notification creation for the active branch', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/notifications')
      .set('Authorization', `Bearer ${branchManagerA1Token}`)
      .send({
        title: 'Phase 5 own branch',
        body: 'Allowed branch notification',
        audience: 'BRANCH_TRAINEES',
        branchId: IDS.branchA,
      })
      .expect(201);

    expect(response.body.branchId).toBe(IDS.branchA);
    expect(response.body.audience).toBe('BRANCH_TRAINEES');
  });

  it('scopes notification admin listing to the active branch', async () => {
    await request(app.getHttpServer())
      .post('/api/notifications')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        title: 'Phase 5 A1 visible',
        body: 'Branch A1 notification',
        audience: 'BRANCH_TRAINEES',
        branchId: IDS.branchA,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/notifications')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        title: 'Phase 5 A2 hidden',
        body: 'Branch A2 notification',
        audience: 'BRANCH_TRAINEES',
        branchId: IDS.branchA2,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/notifications/admin')
      .set('Authorization', `Bearer ${branchManagerA1Token}`)
      .expect(200);

    const body = JSON.stringify(response.body);
    expect(body).toContain('Phase 5 A1 visible');
    expect(body).not.toContain('Phase 5 A2 hidden');
  });

  it('blocks cross-branch notification deletion', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/notifications')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        title: 'Phase 5 A2 delete protected',
        body: 'Branch A2 notification',
        audience: 'BRANCH_TRAINEES',
        branchId: IDS.branchA2,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/notifications/${created.body.id}`)
      .set('Authorization', `Bearer ${branchManagerA1Token}`)
      .expect(403);
  });

  it('keeps academy-admin academy-wide notification creation working', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/notifications')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        title: 'Phase 5 academy admin broadcast',
        body: 'Allowed academy-wide notification',
        audience: 'ALL_TRAINEES',
      })
      .expect(201);

    expect(response.body.audience).toBe('ALL_TRAINEES');
    expect(response.body.branchId).toBeNull();
  });


  it('fails closed when a ranking admin has no branch context', async () => {
    await request(app.getHttpServer())
      .put(`/api/rankings/${IDS.traineeA}`)
      .set('Authorization', `Bearer ${branchManagerNoBranchToken}`)
      .send({
        points: 401,
        note: 'Phase 5 ranking no branch',
      })
      .expect(403);
  });

  it('blocks cross-branch ranking updates', async () => {
    await request(app.getHttpServer())
      .put(`/api/rankings/${IDS.traineeA2}`)
      .set('Authorization', `Bearer ${branchManagerA1Token}`)
      .send({
        points: 402,
        note: 'Phase 5 ranking cross branch update',
      })
      .expect(403);
  });

  it('allows ranking updates in the active branch', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/rankings/${IDS.traineeA}`)
      .set('Authorization', `Bearer ${branchManagerA1Token}`)
      .send({
        points: 403,
        note: 'Phase 5 ranking own branch',
      })
      .expect(200);

    expect(response.body.traineeId).toBe(IDS.traineeA);
    expect(response.body.points).toBe(403);
  });

  it('scopes ranking admin listing to the active branch', async () => {
    await request(app.getHttpServer())
      .put(`/api/rankings/${IDS.traineeA}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        points: 404,
        note: 'Phase 5 ranking A1 visible',
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/rankings/${IDS.traineeA2}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        points: 405,
        note: 'Phase 5 ranking A2 hidden',
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/rankings/admin')
      .set('Authorization', `Bearer ${branchManagerA1Token}`)
      .expect(200);

    const ids = response.body.map(
      (item: { traineeId: string }) => item.traineeId,
    );

    expect(ids).toContain(IDS.traineeA);
    expect(ids).not.toContain(IDS.traineeA2);
  });

  it('blocks cross-branch ranking deletion', async () => {
    await request(app.getHttpServer())
      .put(`/api/rankings/${IDS.traineeA2}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        points: 406,
        note: 'Phase 5 ranking delete protected',
      })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/rankings/${IDS.traineeA2}`)
      .set('Authorization', `Bearer ${branchManagerA1Token}`)
      .expect(403);
  });

  it('keeps academy-admin ranking access academy-wide', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/rankings/${IDS.traineeA2}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        points: 407,
        note: 'Phase 5 ranking academy admin',
      })
      .expect(200);

    expect(response.body.traineeId).toBe(IDS.traineeA2);
    expect(response.body.points).toBe(407);
  });

  it('fails closed when a dashboard branch manager has no branch context', async () => {
    await request(app.getHttpServer())
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${branchManagerNoBranchToken}`)
      .expect(403);
  });

  it('forces branch managers onto their dashboard branch', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/dashboard/overview?branchId=${IDS.branchA2}`)
      .set('Authorization', `Bearer ${branchManagerA1Token}`)
      .expect(200);

    expect(response.body.scope.academyId).toBe(IDS.academyA);
    expect(response.body.scope.branchId).toBe(IDS.branchA);
  });

});
