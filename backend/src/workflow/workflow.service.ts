import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

type WorkflowStatus =
  | 'PENDING'
  | 'READY'
  | 'IN_PROGRESS'
  | 'WAITING_FEEDBACK'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'ESCALATED';

interface WorkflowUser {
  userId: string;
  academyId: string | null;
  branchId: string | null;
  role: string;
}

interface CreateTaskInput {
  academyId?: string | null;
  branchId?: string | null;
  entityType?: string;
  entityId?: string | null;
  taskType: string;
  title: string;
  description?: string | null;
  status?: WorkflowStatus;
  priority?: string;
  assignedRole?: string | null;
  assignedUserId?: string | null;
  parentTaskId?: string | null;
  blockedByTaskId?: string | null;
  nextRoute?: string | null;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
}

interface FeedbackInput {
  type?: string;
  subject?: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class WorkflowService {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async listTasks(
    user: WorkflowUser,
    status?: string,
  ): Promise<unknown[]> {
    const normalizedStatus =
      status?.trim().toUpperCase() || null;

    return this.dataSource.query(
      `
        SELECT
          task.*,
          blocker.title AS blocker_title,
          blocker.status AS blocker_status,
          parent.title AS parent_title,
          (
            SELECT COUNT(*)::int
            FROM workflow_feedback feedback
            WHERE feedback.assigned_task_id = task.id
          ) AS feedback_count
        FROM workflow_tasks task
        LEFT JOIN workflow_tasks blocker
          ON blocker.id = task.blocked_by_task_id
        LEFT JOIN workflow_tasks parent
          ON parent.id = task.parent_task_id
        WHERE
          (
            $1::uuid IS NULL
            OR task.academy_id = $1
          )
          AND (
            $2::text IS NULL
            OR task.status = $2
          )
        ORDER BY
          CASE task.priority
            WHEN 'URGENT' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'NORMAL' THEN 3
            ELSE 4
          END,
          task.created_at DESC
      `,
      [
        user.role === 'SUPER_ADMIN'
          ? null
          : user.academyId,
        normalizedStatus,
      ],
    );
  }

  async createTask(
    user: WorkflowUser,
    input: CreateTaskInput,
  ): Promise<unknown> {
    if (!input.taskType?.trim()) {
      throw new BadRequestException(
        'taskType is required',
      );
    }

    if (!input.title?.trim()) {
      throw new BadRequestException(
        'title is required',
      );
    }

    const academyId =
      user.role === 'SUPER_ADMIN'
        ? input.academyId ?? null
        : user.academyId;

    if (
      user.role !== 'SUPER_ADMIN' &&
      !academyId
    ) {
      throw new ForbiddenException(
        'Academy context is required',
      );
    }

    return this.createTaskIfMissing(
      user.userId,
      {
        ...input,
        academyId,
        branchId:
          input.branchId ??
          user.branchId ??
          null,
      },
    );
  }

  private async createTaskIfMissing(
    createdBy: string | null,
    input: CreateTaskInput,
  ): Promise<Record<string, unknown>> {
    const existing =
      await this.dataSource.query(
        `
          SELECT *
          FROM workflow_tasks
          WHERE
            academy_id IS NOT DISTINCT FROM $1
            AND entity_type = $2
            AND entity_id IS NOT DISTINCT FROM $3
            AND task_type = $4
            AND status NOT IN (
              'COMPLETED',
              'CANCELLED'
            )
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [
          input.academyId ?? null,
          input.entityType ?? 'SYSTEM',
          input.entityId ?? null,
          input.taskType,
        ],
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const id = randomUUID();

    const rows =
      await this.dataSource.query(
        `
          INSERT INTO workflow_tasks (
            id,
            academy_id,
            branch_id,
            entity_type,
            entity_id,
            task_type,
            title,
            description,
            status,
            priority,
            assigned_role,
            assigned_user_id,
            parent_task_id,
            blocked_by_task_id,
            next_route,
            due_at,
            metadata,
            created_by
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16,
            $17::jsonb, $18
          )
          RETURNING *
        `,
        [
          id,
          input.academyId ?? null,
          input.branchId ?? null,
          input.entityType ?? 'SYSTEM',
          input.entityId ?? null,
          input.taskType,
          input.title.trim(),
          input.description ?? null,
          input.status ?? 'READY',
          input.priority ?? 'NORMAL',
          input.assignedRole ?? null,
          input.assignedUserId ?? null,
          input.parentTaskId ?? null,
          input.blockedByTaskId ?? null,
          input.nextRoute ?? null,
          input.dueAt ?? null,
          JSON.stringify(
            input.metadata ?? {},
          ),
          createdBy,
        ],
      );

    await this.createEvent({
      academyId:
        input.academyId ?? null,
      branchId:
        input.branchId ?? null,
      eventType: 'WORKFLOW_TASK_CREATED',
      entityType:
        input.entityType ?? 'SYSTEM',
      entityId:
        input.entityId ?? null,
      actorUserId: createdBy,
      taskId: id,
      payload: {
        taskType: input.taskType,
        status:
          input.status ?? 'READY',
      },
    });

    return rows[0];
  }

  async updateTaskStatus(
    user: WorkflowUser,
    taskId: string,
    status: string,
    failureReason?: string | null,
  ): Promise<unknown> {
    const allowed: WorkflowStatus[] = [
      'PENDING',
      'READY',
      'IN_PROGRESS',
      'WAITING_FEEDBACK',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
      'ESCALATED',
    ];

    const normalized =
      status?.trim().toUpperCase() as
        WorkflowStatus;

    if (!allowed.includes(normalized)) {
      throw new BadRequestException(
        'Invalid workflow status',
      );
    }

    const task = await this.getTask(
      user,
      taskId,
    );

    const rows =
      await this.dataSource.query(
        `
          UPDATE workflow_tasks
          SET
            status = $1,
            failure_reason = $2,
            completed_at =
              CASE
                WHEN $1 = 'COMPLETED'
                  THEN NOW()
                ELSE completed_at
              END,
            updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `,
        [
          normalized,
          failureReason ?? null,
          taskId,
        ],
      );

    await this.createEvent({
      academyId:
        (task.academy_id as string | null) ??
        null,
      branchId:
        (task.branch_id as string | null) ??
        null,
      eventType: `WORKFLOW_TASK_${normalized}`,
      entityType:
        String(task.entity_type),
      entityId:
        (task.entity_id as string | null) ??
        null,
      actorUserId: user.userId,
      taskId,
      payload: {
        failureReason:
          failureReason ?? null,
      },
    });

    if (normalized === 'COMPLETED') {
      await this.dataSource.query(
        `
          UPDATE workflow_tasks
          SET
            status = 'READY',
            blocked_by_task_id = NULL,
            updated_at = NOW()
          WHERE
            blocked_by_task_id = $1
            AND status = 'PENDING'
        `,
        [taskId],
      );

      await this.createNextTask(
        user.userId,
        task,
      );
    }

    return rows[0];
  }

  async escalateTask(
    user: WorkflowUser,
    taskId: string,
    reason?: string,
  ): Promise<unknown> {
    const task = await this.getTask(
      user,
      taskId,
    );

    const rows =
      await this.dataSource.query(
        `
          UPDATE workflow_tasks
          SET
            status = 'ESCALATED',
            assigned_role = 'SUPER_ADMIN',
            failure_reason = $1,
            updated_at = NOW()
          WHERE id = $2
          RETURNING *
        `,
        [
          reason?.trim() ||
            'Escalated for super-admin review',
          taskId,
        ],
      );

    await this.createEvent({
      academyId:
        (task.academy_id as string | null) ??
        null,
      branchId:
        (task.branch_id as string | null) ??
        null,
      eventType: 'TASK_ESCALATED',
      entityType:
        String(task.entity_type),
      entityId:
        (task.entity_id as string | null) ??
        null,
      actorUserId: user.userId,
      taskId,
      payload: {
        reason: reason ?? null,
      },
    });

    return rows[0];
  }

  async syncTasks(
    user: WorkflowUser,
  ): Promise<unknown[]> {
    const academies =
      await this.dataSource.query(
        `
          SELECT
            academy.id,
            academy.name
          FROM academies academy
          WHERE
            academy.deleted_at IS NULL
            AND (
              $1::uuid IS NULL
              OR academy.id = $1
            )
          ORDER BY academy.created_at ASC
        `,
        [
          user.role === 'SUPER_ADMIN'
            ? null
            : user.academyId,
        ],
      );

    for (const academy of academies) {
      await this.syncAcademy(
        user.userId,
        String(academy.id),
        String(academy.name),
      );
    }

    return this.listTasks(user);
  }

  private async syncAcademy(
    actorUserId: string,
    academyId: string,
    academyName: string,
  ): Promise<void> {
    const [
      branchResult,
      managerResult,
      groupResult,
      traineeResult,
    ] = await Promise.all([
      this.dataSource.query(
        `
          SELECT COUNT(*)::int AS count
          FROM branches
          WHERE
            academy_id = $1
            AND deleted_at IS NULL
        `,
        [academyId],
      ),
      this.dataSource.query(
        `
          SELECT COUNT(*)::int AS count
          FROM academy_memberships
          WHERE
            academy_id = $1
            AND role = 'ACADEMY_ADMIN'
            AND is_active = TRUE
            AND deleted_at IS NULL
        `,
        [academyId],
      ),
      this.dataSource.query(
        `
          SELECT COUNT(*)::int AS count
          FROM training_groups
          WHERE
            academy_id = $1
            AND deleted_at IS NULL
        `,
        [academyId],
      ),
      this.dataSource.query(
        `
          SELECT COUNT(*)::int AS count
          FROM trainees
          WHERE
            academy_id = $1
            AND deleted_at IS NULL
        `,
        [academyId],
      ),
    ]);

    const branchCount =
      Number(branchResult[0]?.count ?? 0);
    const managerCount =
      Number(managerResult[0]?.count ?? 0);
    const groupCount =
      Number(groupResult[0]?.count ?? 0);
    const traineeCount =
      Number(traineeResult[0]?.count ?? 0);

    const branchTask =
      branchCount > 0
        ? await this.ensureCompletedTask(
            actorUserId,
            academyId,
            'CREATE_MAIN_BRANCH',
            `إنشاء الفرع الرئيسي — ${academyName}`,
            'SUPER_ADMIN',
            '#super-admin',
          )
        : await this.createTaskIfMissing(
            actorUserId,
            {
              academyId,
              entityType: 'ACADEMY',
              entityId: academyId,
              taskType:
                'CREATE_MAIN_BRANCH',
              title:
                `إنشاء الفرع الرئيسي — ${academyName}`,
              description:
                'يجب إنشاء فرع رئيسي قبل تسليم إدارة الأكاديمية.',
              status: 'READY',
              priority: 'HIGH',
              assignedRole:
                'SUPER_ADMIN',
              nextRoute:
                '#super-admin',
            },
          );

    const managerTask =
      managerCount > 0
        ? await this.ensureCompletedTask(
            actorUserId,
            academyId,
            'CREATE_ACADEMY_MANAGER',
            `إنشاء مدير الأكاديمية — ${academyName}`,
            'SUPER_ADMIN',
            '#super-admin',
            String(branchTask.id),
          )
        : await this.createTaskIfMissing(
            actorUserId,
            {
              academyId,
              entityType: 'ACADEMY',
              entityId: academyId,
              taskType:
                'CREATE_ACADEMY_MANAGER',
              title:
                `إنشاء مدير الأكاديمية — ${academyName}`,
              description:
                'إنشاء وتفعيل حساب مدير الأكاديمية.',
              status:
                branchCount > 0
                  ? 'READY'
                  : 'PENDING',
              priority: 'HIGH',
              assignedRole:
                'SUPER_ADMIN',
              parentTaskId:
                String(branchTask.id),
              blockedByTaskId:
                branchCount > 0
                  ? null
                  : String(branchTask.id),
              nextRoute:
                '#super-admin',
            },
          );

    if (managerCount > 1) {
      await this.createTaskIfMissing(
        actorUserId,
        {
          academyId,
          entityType: 'ACADEMY',
          entityId: academyId,
          taskType:
            'REVIEW_DUPLICATE_ACADEMY_MANAGERS',
          title:
            `مراجعة مديري الأكاديمية — ${academyName}`,
          description:
            `تم اكتشاف ${managerCount} حسابات مدير أكاديمية نشطة. يجب تحديد المدير الأساسي وتعطيل الحسابات الزائدة عند الحاجة.`,
          status: 'READY',
          priority: 'HIGH',
          assignedRole:
            'SUPER_ADMIN',
          parentTaskId:
            String(managerTask.id),
          nextRoute:
            '#super-admin',
          metadata: {
            activeManagerCount:
              managerCount,
          },
        },
      );
    }

    const groupTask =
      groupCount > 0
        ? await this.ensureCompletedTask(
            actorUserId,
            academyId,
            'CREATE_TRAINING_GROUP',
            `إنشاء أول مجموعة تدريبية — ${academyName}`,
            'ACADEMY_ADMIN',
            '#groups',
            String(managerTask.id),
          )
        : await this.createTaskIfMissing(
            actorUserId,
            {
              academyId,
              entityType: 'ACADEMY',
              entityId: academyId,
              taskType:
                'CREATE_TRAINING_GROUP',
              title:
                `إنشاء أول مجموعة تدريبية — ${academyName}`,
              description:
                'إنشاء المجموعة والمواعيد وربطها بالفرع والبرنامج.',
              status:
                managerCount > 0
                  ? 'READY'
                  : 'PENDING',
              priority: 'NORMAL',
              assignedRole:
                'ACADEMY_ADMIN',
              parentTaskId:
                String(managerTask.id),
              blockedByTaskId:
                managerCount > 0
                  ? null
                  : String(managerTask.id),
              nextRoute: '#groups',
            },
          );

    if (traineeCount > 0) {
      const traineeTask =
        await this.ensureCompletedTask(
          actorUserId,
          academyId,
          'ADD_TRAINEE',
          `إضافة المتدربين — ${academyName}`,
          'ACADEMY_ADMIN',
          '#trainees',
          String(groupTask.id),
        );

      await this.createTaskIfMissing(
        actorUserId,
        {
          academyId,
          entityType: 'ACADEMY',
          entityId: academyId,
          taskType:
            'LINK_PORTAL_ACCOUNT',
          title:
            `مراجعة وربط حسابات بوابة المتدربين — ${academyName}`,
          description:
            `تم اكتشاف ${traineeCount} متدرب. راجع إنشاء وربط حساب البوابة لكل متدرب وولي أمره قبل تسليم مرحلة الاشتراكات.`,
          status: 'READY',
          priority: 'HIGH',
          assignedRole:
            'ACADEMY_ADMIN',
          parentTaskId:
            String(traineeTask.id),
          nextRoute:
            '#portal-links',
          metadata: {
            traineeCount,
          },
        },
      );
    } else {
      await this.createTaskIfMissing(
        actorUserId,
        {
          academyId,
          entityType: 'ACADEMY',
          entityId: academyId,
          taskType: 'ADD_TRAINEE',
          title:
            `إضافة أول متدرب — ${academyName}`,
          description:
            'إضافة المتدرب وربطه بالفرع والمجموعة والصورة.',
          status:
            groupCount > 0
              ? 'READY'
              : 'PENDING',
          priority: 'NORMAL',
          assignedRole:
            'ACADEMY_ADMIN',
          parentTaskId:
            String(groupTask.id),
          blockedByTaskId:
            groupCount > 0
              ? null
              : String(groupTask.id),
          nextRoute: '#trainees',
        },
      );
    }

    await this.syncOperationalChain(
      actorUserId,
      academyId,
      academyName,
      traineeCount,
    );
  }

  private async syncOperationalChain(
    actorUserId: string,
    academyId: string,
    academyName: string,
    traineeCount: number,
  ): Promise<void> {
    if (traineeCount <= 0) {
      return;
    }

    const [
      portalResult,
      subscriptionResult,
      paymentResult,
      activeResult,
      attendanceResult,
      rankingResult,
      notificationResult,
      addTraineeTaskResult,
    ] = await Promise.all([
      this.dataSource.query(
        `
          SELECT
            COUNT(
              DISTINCT trainee_id
            )::int AS count
          FROM portal_trainee_links
          WHERE
            academy_id = $1
            AND is_active = TRUE
            AND deleted_at IS NULL
        `,
        [academyId],
      ),

      this.dataSource.query(
        `
          SELECT
            COUNT(
              DISTINCT trainee_id
            )::int AS count
          FROM trainee_subscriptions
          WHERE
            academy_id = $1
            AND deleted_at IS NULL
            AND status::text <> 'CANCELLED'
        `,
        [academyId],
      ),

      this.dataSource.query(
        `
          SELECT
            COUNT(*)::int AS required_count,

            COUNT(*) FILTER (
              WHERE EXISTS (
                SELECT 1
                FROM payments payment
                WHERE
                  payment.subscription_id =
                    subscription.id
                  AND payment.deleted_at IS NULL
              )
            )::int AS paid_count

          FROM trainee_subscriptions subscription
          WHERE
            subscription.academy_id = $1
            AND subscription.deleted_at IS NULL
            AND subscription.status::text <>
              'CANCELLED'
            AND subscription.total_amount > 0
        `,
        [academyId],
      ),

      this.dataSource.query(
        `
          SELECT
            COUNT(
              DISTINCT trainee_id
            )::int AS count
          FROM trainee_subscriptions
          WHERE
            academy_id = $1
            AND deleted_at IS NULL
            AND status::text = 'ACTIVE'
        `,
        [academyId],
      ),

      this.dataSource.query(
        `
          SELECT
            COUNT(*)::int AS records,
            COUNT(
              DISTINCT trainee_id
            )::int AS trainees
          FROM attendance_records
          WHERE
            academy_id = $1
            AND deleted_at IS NULL
        `,
        [academyId],
      ),

      this.dataSource.query(
        `
          SELECT
            COUNT(
              DISTINCT trainee_id
            )::int AS count
          FROM trainee_rankings
          WHERE
            academy_id = $1
            AND deleted_at IS NULL
        `,
        [academyId],
      ),

      this.dataSource.query(
        `
          SELECT
            COUNT(*)::int AS count
          FROM academy_notifications
          WHERE
            academy_id = $1
            AND deleted_at IS NULL
        `,
        [academyId],
      ),

      this.dataSource.query(
        `
          SELECT id, status
          FROM workflow_tasks
          WHERE
            academy_id = $1
            AND task_type = 'ADD_TRAINEE'
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [academyId],
      ),
    ]);

    const portalLinked =
      Number(
        portalResult[0]?.count ?? 0,
      );

    const subscribedTrainees =
      Number(
        subscriptionResult[0]?.count ?? 0,
      );

    const paymentRequired =
      Number(
        paymentResult[0]
          ?.required_count ?? 0,
      );

    const paymentRecorded =
      Number(
        paymentResult[0]
          ?.paid_count ?? 0,
      );

    const activeSubscriptions =
      Number(
        activeResult[0]?.count ?? 0,
      );

    const attendanceRecords =
      Number(
        attendanceResult[0]
          ?.records ?? 0,
      );

    const attendanceTrainees =
      Number(
        attendanceResult[0]
          ?.trainees ?? 0,
      );

    const rankedTrainees =
      Number(
        rankingResult[0]?.count ?? 0,
      );

    const notificationCount =
      Number(
        notificationResult[0]
          ?.count ?? 0,
      );

    const addTraineeTask =
      addTraineeTaskResult[0] ?? null;

    let previousTask =
      addTraineeTask;

    const portalComplete =
      portalLinked >= traineeCount;

    const portalTask =
      portalComplete
        ? await this.ensureCompletedTask(
            actorUserId,
            academyId,
            'LINK_PORTAL_ACCOUNT',
            `ربط حسابات بوابة المتدربين — ${academyName}`,
            'ACADEMY_ADMIN',
            '#portal-links',
            previousTask?.id ?? null,
          )
        : await this.ensureOpenTask(
            actorUserId,
            {
              academyId,
              taskType:
                'LINK_PORTAL_ACCOUNT',
              title:
                `استكمال ربط بوابة المتدربين — ${academyName}`,
              description:
                `تم ربط ${portalLinked} من أصل ${traineeCount} متدربين. المتبقي: ${Math.max(
                  traineeCount -
                    portalLinked,
                  0,
                )}.`,
              status:
                previousTask?.status ===
                'COMPLETED'
                  ? 'READY'
                  : 'PENDING',
              priority: 'HIGH',
              assignedRole:
                'ACADEMY_ADMIN',
              parentTaskId:
                previousTask?.id ?? null,
              blockedByTaskId:
                previousTask?.status ===
                'COMPLETED'
                  ? null
                  : previousTask?.id ??
                    null,
              nextRoute:
                '#portal-links',
              metadata: {
                traineeCount,
                portalLinked,
                missing:
                  Math.max(
                    traineeCount -
                      portalLinked,
                    0,
                  ),
              },
            },
          );

    previousTask = portalTask;

    const subscriptionComplete =
      subscribedTrainees >= traineeCount;

    const subscriptionTask =
      subscriptionComplete
        ? await this.ensureCompletedTask(
            actorUserId,
            academyId,
            'CREATE_SUBSCRIPTION',
            `إنشاء اشتراكات المتدربين — ${academyName}`,
            'ACCOUNTANT',
            '#billing',
            previousTask?.id ?? null,
          )
        : await this.ensureOpenTask(
            actorUserId,
            {
              academyId,
              taskType:
                'CREATE_SUBSCRIPTION',
              title:
                `استكمال اشتراكات المتدربين — ${academyName}`,
              description:
                `يوجد اشتراك لـ ${subscribedTrainees} من أصل ${traineeCount} متدربين.`,
              status:
                previousTask?.status ===
                'COMPLETED'
                  ? 'READY'
                  : 'PENDING',
              priority: 'HIGH',
              assignedRole:
                'ACCOUNTANT',
              parentTaskId:
                previousTask?.id ?? null,
              blockedByTaskId:
                previousTask?.status ===
                'COMPLETED'
                  ? null
                  : previousTask?.id ??
                    null,
              nextRoute: '#billing',
              metadata: {
                traineeCount,
                subscribedTrainees,
              },
            },
          );

    previousTask = subscriptionTask;

    const paymentComplete =
      paymentRequired === 0 ||
      paymentRecorded >= paymentRequired;

    const paymentTask =
      paymentComplete
        ? await this.ensureCompletedTask(
            actorUserId,
            academyId,
            'RECORD_PAYMENT',
            `تسجيل دفعات الاشتراكات — ${academyName}`,
            'ACCOUNTANT',
            '#billing',
            previousTask?.id ?? null,
          )
        : await this.ensureOpenTask(
            actorUserId,
            {
              academyId,
              taskType:
                'RECORD_PAYMENT',
              title:
                `تسجيل الدفعات المستحقة — ${academyName}`,
              description:
                `تم تسجيل دفعات لـ ${paymentRecorded} من أصل ${paymentRequired} اشتراكات مدفوعة مطلوبة.`,
              status:
                previousTask?.status ===
                'COMPLETED'
                  ? 'READY'
                  : 'PENDING',
              priority: 'HIGH',
              assignedRole:
                'ACCOUNTANT',
              parentTaskId:
                previousTask?.id ?? null,
              blockedByTaskId:
                previousTask?.status ===
                'COMPLETED'
                  ? null
                  : previousTask?.id ??
                    null,
              nextRoute: '#billing',
              metadata: {
                paymentRequired,
                paymentRecorded,
              },
            },
          );

    previousTask = paymentTask;

    const activationComplete =
      activeSubscriptions >=
      traineeCount;

    const activationTask =
      activationComplete
        ? await this.ensureCompletedTask(
            actorUserId,
            academyId,
            'ACTIVATE_SUBSCRIPTION',
            `تفعيل اشتراكات المتدربين — ${academyName}`,
            'ACADEMY_ADMIN',
            '#billing',
            previousTask?.id ?? null,
          )
        : await this.ensureOpenTask(
            actorUserId,
            {
              academyId,
              taskType:
                'ACTIVATE_SUBSCRIPTION',
              title:
                `استكمال تفعيل الاشتراكات — ${academyName}`,
              description:
                `الاشتراكات النشطة: ${activeSubscriptions} من أصل ${traineeCount}.`,
              status:
                previousTask?.status ===
                'COMPLETED'
                  ? 'READY'
                  : 'PENDING',
              priority: 'NORMAL',
              assignedRole:
                'ACADEMY_ADMIN',
              parentTaskId:
                previousTask?.id ?? null,
              blockedByTaskId:
                previousTask?.status ===
                'COMPLETED'
                  ? null
                  : previousTask?.id ??
                    null,
              nextRoute: '#billing',
              metadata: {
                traineeCount,
                activeSubscriptions,
              },
            },
          );

    previousTask = activationTask;

    const sessionComplete =
      attendanceRecords > 0;

    const sessionTask =
      sessionComplete
        ? await this.ensureCompletedTask(
            actorUserId,
            academyId,
            'CREATE_ATTENDANCE_SESSION',
            `إنشاء جلسات الحضور — ${academyName}`,
            'COACH',
            '#attendance',
            previousTask?.id ?? null,
          )
        : await this.ensureOpenTask(
            actorUserId,
            {
              academyId,
              taskType:
                'CREATE_ATTENDANCE_SESSION',
              title:
                `إنشاء أول جلسة حضور — ${academyName}`,
              description:
                'لا توجد سجلات حضور، أنشئ جلسة حضور للمجموعة.',
              status:
                previousTask?.status ===
                'COMPLETED'
                  ? 'READY'
                  : 'PENDING',
              priority: 'NORMAL',
              assignedRole: 'COACH',
              parentTaskId:
                previousTask?.id ?? null,
              blockedByTaskId:
                previousTask?.status ===
                'COMPLETED'
                  ? null
                  : previousTask?.id ??
                    null,
              nextRoute: '#attendance',
              metadata: {
                attendanceRecords,
              },
            },
          );

    previousTask = sessionTask;

    const attendanceComplete =
      attendanceRecords > 0;

    const attendanceTask =
      attendanceComplete
        ? await this.ensureCompletedTask(
            actorUserId,
            academyId,
            'RECORD_ATTENDANCE',
            `تسجيل حضور المتدربين — ${academyName}`,
            'COACH',
            '#attendance',
            previousTask?.id ?? null,
          )
        : await this.ensureOpenTask(
            actorUserId,
            {
              academyId,
              taskType:
                'RECORD_ATTENDANCE',
              title:
                `تسجيل حضور المتدربين — ${academyName}`,
              description:
                'لم يتم تسجيل حضور للمتدربين حتى الآن.',
              status:
                previousTask?.status ===
                'COMPLETED'
                  ? 'READY'
                  : 'PENDING',
              priority: 'NORMAL',
              assignedRole: 'COACH',
              parentTaskId:
                previousTask?.id ?? null,
              blockedByTaskId:
                previousTask?.status ===
                'COMPLETED'
                  ? null
                  : previousTask?.id ??
                    null,
              nextRoute: '#attendance',
              metadata: {
                attendanceRecords,
                attendanceTrainees,
              },
            },
          );

    previousTask = attendanceTask;

    const rankingComplete =
      rankedTrainees > 0;

    const rankingTask =
      rankingComplete
        ? await this.ensureCompletedTask(
            actorUserId,
            academyId,
            'UPDATE_RANKING',
            `تحديث ترتيب المتدربين — ${academyName}`,
            'COACH',
            '#rankings',
            previousTask?.id ?? null,
          )
        : await this.ensureOpenTask(
            actorUserId,
            {
              academyId,
              taskType:
                'UPDATE_RANKING',
              title:
                `إضافة نقاط وترتيب المتدربين — ${academyName}`,
              description:
                'لم يتم تسجيل أي نقاط أو ترتيب للمتدربين حتى الآن.',
              status:
                previousTask?.status ===
                'COMPLETED'
                  ? 'READY'
                  : 'PENDING',
              priority: 'NORMAL',
              assignedRole: 'COACH',
              parentTaskId:
                previousTask?.id ?? null,
              blockedByTaskId:
                previousTask?.status ===
                'COMPLETED'
                  ? null
                  : previousTask?.id ??
                    null,
              nextRoute: '#rankings',
              metadata: {
                rankedTrainees,
              },
            },
          );

    previousTask = rankingTask;

    const notificationComplete =
      notificationCount > 0;

    if (notificationComplete) {
      await this.ensureCompletedTask(
        actorUserId,
        academyId,
        'PUBLISH_NOTIFICATION',
        `نشر إشعار للمتدربين — ${academyName}`,
        'ACADEMY_ADMIN',
        '#notifications',
        previousTask?.id ?? null,
      );
    } else {
      await this.ensureOpenTask(
        actorUserId,
        {
          academyId,
          taskType:
            'PUBLISH_NOTIFICATION',
          title:
            `إرسال إشعار للمتدربين — ${academyName}`,
          description:
            'لا توجد إشعارات منشورة للمتدربين أو أولياء الأمور.',
          status:
            previousTask?.status ===
            'COMPLETED'
              ? 'READY'
              : 'PENDING',
          priority: 'NORMAL',
          assignedRole:
            'ACADEMY_ADMIN',
          parentTaskId:
            previousTask?.id ?? null,
          blockedByTaskId:
            previousTask?.status ===
            'COMPLETED'
              ? null
              : previousTask?.id ??
                null,
          nextRoute:
            '#notifications',
          metadata: {
            notificationCount,
          },
        },
      );
    }
  }

  private async ensureOpenTask(
    actorUserId: string,
    input: {
      academyId: string;
      taskType: string;
      title: string;
      description: string;
      status: 'READY' | 'PENDING';
      priority: string;
      assignedRole: string;
      parentTaskId: string | null;
      blockedByTaskId: string | null;
      nextRoute: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<Record<string, unknown>> {
    const existing =
      await this.dataSource.query(
        `
          SELECT *
          FROM workflow_tasks
          WHERE
            academy_id = $1
            AND entity_type = 'ACADEMY'
            AND entity_id = $1
            AND task_type = $2
            AND status NOT IN (
              'COMPLETED',
              'CANCELLED'
            )
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [
          input.academyId,
          input.taskType,
        ],
      );

    if (existing.length > 0) {
      await this.dataSource.query(
          `
            UPDATE workflow_tasks
            SET
              title = $1,
              description = $2,
              status = $3,
              priority = $4,
              assigned_role = $5,
              parent_task_id = $6,
              blocked_by_task_id = $7,
              next_route = $8,
              metadata = $9::jsonb,
              completed_at = NULL,
              updated_at = NOW()
            WHERE id = $10
            RETURNING *
          `,
          [
            input.title,
            input.description,
            input.status,
            input.priority,
            input.assignedRole,
            input.parentTaskId,
            input.blockedByTaskId,
            input.nextRoute,
            JSON.stringify(
              input.metadata,
            ),
            existing[0].id,
          ],
        );

      const refreshedRows =
        await this.dataSource.query(
          `
            SELECT *
            FROM workflow_tasks
            WHERE id = $1
            LIMIT 1
          `,
          [existing[0].id],
        );

      if (!refreshedRows[0]?.id) {
        throw new Error(
          'Workflow task could not be loaded after update',
        );
      }

      return refreshedRows[0];
    }

    await this.createTaskIfMissing(
      actorUserId,
      {
        academyId: input.academyId,
        entityType: 'ACADEMY',
        entityId: input.academyId,
        taskType: input.taskType,
        title: input.title,
        description:
          input.description,
        status: input.status,
        priority: input.priority,
        assignedRole:
          input.assignedRole,
        parentTaskId:
          input.parentTaskId,
        blockedByTaskId:
          input.blockedByTaskId,
        nextRoute: input.nextRoute,
        metadata: input.metadata,
      },
    );

    const createdRows =
      await this.dataSource.query(
        `
          SELECT *
          FROM workflow_tasks
          WHERE
            academy_id = $1
            AND entity_type = 'ACADEMY'
            AND entity_id = $1
            AND task_type = $2
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [
          input.academyId,
          input.taskType,
        ],
      );

    if (!createdRows[0]?.id) {
      throw new Error(
        'Workflow task could not be loaded after create',
      );
    }

    return createdRows[0];
  }

  private async ensureCompletedTask(
    actorUserId: string,
    academyId: string,
    taskType: string,
    title: string,
    assignedRole: string,
    nextRoute: string,
    parentTaskId?: string | null,
  ): Promise<Record<string, unknown>> {
    const existing =
      await this.dataSource.query(
        `
          SELECT *
          FROM workflow_tasks
          WHERE
            academy_id = $1
            AND entity_type = 'ACADEMY'
            AND entity_id = $1
            AND task_type = $2
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [
          academyId,
          taskType,
        ],
      );

    if (existing.length > 0) {
      await this.dataSource.query(
          `
            UPDATE workflow_tasks
            SET
              status = 'COMPLETED',
              assigned_role = $1,
              parent_task_id =
                COALESCE(
                  parent_task_id,
                  $2
                ),
              next_route =
                COALESCE(
                  next_route,
                  $3
                ),
              completed_at =
                COALESCE(
                  completed_at,
                  NOW()
                ),
              updated_at = NOW()
            WHERE id = $4
            RETURNING *
          `,
          [
            assignedRole,
            parentTaskId ?? null,
            nextRoute,
            existing[0].id,
          ],
        );

      const refreshedRows =
        await this.dataSource.query(
          `
            SELECT *
            FROM workflow_tasks
            WHERE id = $1
            LIMIT 1
          `,
          [existing[0].id],
        );

      if (!refreshedRows[0]?.id) {
        throw new Error(
          'Workflow task could not be loaded after update',
        );
      }

      return refreshedRows[0];
    }

    await this.createTaskIfMissing(
      actorUserId,
      {
        academyId,
        entityType: 'ACADEMY',
        entityId: academyId,
        taskType,
        title,
        description:
          'تم اكتشاف اكتمال هذه الخطوة تلقائيًا من بيانات النظام الحالية.',
        status: 'COMPLETED',
        priority: 'NORMAL',
        assignedRole,
        parentTaskId:
          parentTaskId ?? null,
        nextRoute,
        metadata: {
          autoDetected: true,
        },
      },
    );

    const createdRows =
      await this.dataSource.query(
        `
          SELECT *
          FROM workflow_tasks
          WHERE
            academy_id = $1
            AND entity_type = 'ACADEMY'
            AND entity_id = $1
            AND task_type = $2
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [
          academyId,
          taskType,
        ],
      );

    if (!createdRows[0]?.id) {
      throw new Error(
        'Workflow task could not be loaded after create',
      );
    }

    return createdRows[0];
  }

  async submitFeedback(
    user: WorkflowUser,
    input: FeedbackInput,
  ): Promise<unknown> {
    if (!input.message?.trim()) {
      throw new BadRequestException(
        'Feedback message is required',
      );
    }

    const feedbackId = randomUUID();

    const task =
      await this.createTaskIfMissing(
        user.userId,
        {
          academyId: user.academyId,
          branchId: user.branchId,
          entityType:
            input.entityType ??
            'CLIENT_FEEDBACK',
          entityId:
            input.entityId ?? null,
          taskType: 'CLIENT_FEEDBACK',
          title:
            input.subject?.trim() ||
            'ملاحظة جديدة من المتدرب أو ولي الأمر',
          description:
            input.message.trim(),
          status: 'READY',
          priority: 'HIGH',
          assignedRole:
            'ACADEMY_ADMIN',
          nextRoute:
            `#workflow?feedbackId=${feedbackId}`,
          metadata: {
            feedbackId,
            feedbackType:
              input.type ?? 'GENERAL',
          },
        },
      );

    const rows =
      await this.dataSource.query(
        `
          INSERT INTO workflow_feedback (
            id,
            academy_id,
            branch_id,
            created_by,
            feedback_type,
            subject,
            message,
            status,
            entity_type,
            entity_id,
            assigned_task_id,
            metadata
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, 'OPEN', $8, $9, $10,
            $11::jsonb
          )
          RETURNING *
        `,
        [
          feedbackId,
          user.academyId,
          user.branchId,
          user.userId,
          input.type ?? 'GENERAL',
          input.subject?.trim() ||
            'ملاحظة جديدة',
          input.message.trim(),
          input.entityType ?? null,
          input.entityId ?? null,
          task.id,
          JSON.stringify(
            input.metadata ?? {},
          ),
        ],
      );

    await this.createEvent({
      academyId: user.academyId,
      branchId: user.branchId,
      eventType: 'FEEDBACK_CREATED',
      entityType:
        input.entityType ??
        'CLIENT_FEEDBACK',
      entityId:
        input.entityId ?? null,
      actorUserId: user.userId,
      taskId: String(task.id),
      payload: {
        feedbackId,
        feedbackType:
          input.type ?? 'GENERAL',
      },
    });

    return {
      feedback: rows[0],
      task,
    };
  }

  async listMyFeedback(
    user: WorkflowUser,
  ): Promise<unknown[]> {
    return this.dataSource.query(
      `
        SELECT
          feedback.*,
          task.status AS task_status,
          task.title AS task_title
        FROM workflow_feedback feedback
        LEFT JOIN workflow_tasks task
          ON task.id =
            feedback.assigned_task_id
        WHERE feedback.created_by = $1
        ORDER BY feedback.created_at DESC
      `,
      [user.userId],
    );
  }

  async resolveFeedback(
    user: WorkflowUser,
    feedbackId: string,
    response: string,
  ): Promise<unknown> {
    if (!response?.trim()) {
      throw new BadRequestException(
        'Admin response is required',
      );
    }

    const feedbackRows =
      await this.dataSource.query(
        `
          SELECT *
          FROM workflow_feedback
          WHERE id = $1
          LIMIT 1
        `,
        [feedbackId],
      );

    if (feedbackRows.length === 0) {
      throw new NotFoundException(
        'Feedback not found',
      );
    }

    const feedback = feedbackRows[0];

    if (
      user.role !== 'SUPER_ADMIN' &&
      feedback.academy_id !==
        user.academyId
    ) {
      throw new ForbiddenException();
    }

    const rows =
      await this.dataSource.query(
        `
          UPDATE workflow_feedback
          SET
            status = 'RESOLVED',
            admin_response = $1,
            resolved_by = $2,
            resolved_at = NOW(),
            updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `,
        [
          response.trim(),
          user.userId,
          feedbackId,
        ],
      );

    if (feedback.assigned_task_id) {
      await this.dataSource.query(
        `
          UPDATE workflow_tasks
          SET
            status = 'COMPLETED',
            completed_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
        `,
        [feedback.assigned_task_id],
      );
    }

    await this.createEvent({
      academyId:
        feedback.academy_id ?? null,
      branchId:
        feedback.branch_id ?? null,
      eventType: 'FEEDBACK_RESOLVED',
      entityType:
        feedback.entity_type ??
        'CLIENT_FEEDBACK',
      entityId:
        feedback.entity_id ?? null,
      actorUserId: user.userId,
      taskId:
        feedback.assigned_task_id ??
        null,
      payload: {
        feedbackId,
      },
    });

    return rows[0];
  }

  private async getTask(
    user: WorkflowUser,
    taskId: string,
  ): Promise<Record<string, unknown>> {
    const rows =
      await this.dataSource.query(
        `
          SELECT *
          FROM workflow_tasks
          WHERE id = $1
          LIMIT 1
        `,
        [taskId],
      );

    if (rows.length === 0) {
      throw new NotFoundException(
        'Workflow task not found',
      );
    }

    const task = rows[0];

    if (
      user.role !== 'SUPER_ADMIN' &&
      task.academy_id !==
        user.academyId
    ) {
      throw new ForbiddenException();
    }

    return task;
  }

  private async createNextTask(
    actorUserId: string,
    task: Record<string, unknown>,
  ): Promise<void> {
    const chain: Record<
      string,
      {
        taskType: string;
        title: string;
        route: string;
        assignedRole: string;
      }
    > = {
      ADD_TRAINEE: {
        taskType:
          'LINK_PORTAL_ACCOUNT',
        title:
          'إنشاء أو ربط حساب بوابة المتدرب',
        route: '#portal-links',
        assignedRole:
          'ACADEMY_ADMIN',
      },
      LINK_PORTAL_ACCOUNT: {
        taskType:
          'CREATE_SUBSCRIPTION',
        title:
          'إنشاء اشتراك للمتدرب',
        route: '#billing',
        assignedRole: 'ACCOUNTANT',
      },
      CREATE_SUBSCRIPTION: {
        taskType: 'RECORD_PAYMENT',
        title:
          'تسجيل الدفعة أو المديونية',
        route: '#billing',
        assignedRole: 'ACCOUNTANT',
      },
      RECORD_PAYMENT: {
        taskType:
          'ACTIVATE_SUBSCRIPTION',
        title:
          'تفعيل اشتراك المتدرب',
        route: '#billing',
        assignedRole:
          'ACADEMY_ADMIN',
      },
      ACTIVATE_SUBSCRIPTION: {
        taskType:
          'CREATE_ATTENDANCE_SESSION',
        title:
          'إنشاء جلسة حضور للمجموعة',
        route: '#attendance',
        assignedRole: 'COACH',
      },
      CREATE_ATTENDANCE_SESSION: {
        taskType:
          'RECORD_ATTENDANCE',
        title:
          'تسجيل حضور المتدربين',
        route: '#attendance',
        assignedRole: 'COACH',
      },
      RECORD_ATTENDANCE: {
        taskType: 'UPDATE_RANKING',
        title:
          'تحديث نقاط وترتيب المتدربين',
        route: '#rankings',
        assignedRole: 'COACH',
      },
      UPDATE_RANKING: {
        taskType:
          'PUBLISH_NOTIFICATION',
        title:
          'إرسال النتيجة للمتدرب وولي الأمر',
        route: '#notifications',
        assignedRole:
          'ACADEMY_ADMIN',
      },
    };

    const next =
      chain[String(task.task_type)];

    if (!next) {
      return;
    }

    await this.createTaskIfMissing(
      actorUserId,
      {
        academyId:
          (task.academy_id as
            | string
            | null) ?? null,
        branchId:
          (task.branch_id as
            | string
            | null) ?? null,
        entityType:
          String(task.entity_type),
        entityId:
          (task.entity_id as
            | string
            | null) ?? null,
        taskType: next.taskType,
        title: next.title,
        description:
          `تم إنشاء هذه المهمة تلقائيًا بعد إكمال: ${String(
            task.title,
          )}`,
        status: 'READY',
        assignedRole:
          next.assignedRole,
        parentTaskId:
          String(task.id),
        nextRoute: next.route,
        metadata: {
          generatedFromTaskId:
            task.id,
        },
      },
    );
  }

  private async createEvent(input: {
    academyId: string | null;
    branchId: string | null;
    eventType: string;
    entityType: string;
    entityId: string | null;
    actorUserId: string | null;
    taskId: string | null;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const eventId = randomUUID();

    await this.dataSource.query(
      `
        INSERT INTO workflow_events (
          id,
          academy_id,
          branch_id,
          event_type,
          entity_type,
          entity_id,
          actor_user_id,
          task_id,
          payload
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9::jsonb
        )
      `,
      [
        eventId,
        input.academyId,
        input.branchId,
        input.eventType,
        input.entityType,
        input.entityId,
        input.actorUserId,
        input.taskId,
        JSON.stringify(input.payload),
      ],
    );

    await this.dataSource.query(
      `
        INSERT INTO workflow_outbox (
          id,
          event_type,
          payload
        )
        VALUES (
          $1,
          $2,
          $3::jsonb
        )
      `,
      [
        randomUUID(),
        input.eventType,
        JSON.stringify({
          eventId,
          academyId:
            input.academyId,
          branchId:
            input.branchId,
          entityType:
            input.entityType,
          entityId:
            input.entityId,
          taskId: input.taskId,
          ...input.payload,
        }),
      ],
    );
  }
}
