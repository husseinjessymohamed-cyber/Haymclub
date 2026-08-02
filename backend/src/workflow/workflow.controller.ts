import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import {
  Roles,
} from '../auth/decorators/roles.decorator';
import {
  AcademyRole,
} from '../memberships/entities/academy-membership.entity';
import {
  WorkflowService,
} from './workflow.service';

const ADMIN_ROLES = [
  AcademyRole.SUPER_ADMIN,
  AcademyRole.ACADEMY_ADMIN,
  AcademyRole.BRANCH_MANAGER,
  AcademyRole.RECEPTIONIST,
  AcademyRole.ACCOUNTANT,
  AcademyRole.COACH,
];

const ALL_ROLES = [
  ...ADMIN_ROLES,
  AcademyRole.PARENT,
  AcademyRole.TRAINEE,
];

@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService:
      WorkflowService,
  ) {}

  private currentUser(
    userId: string,
    academyId: string | null,
    branchId: string | null,
    role: AcademyRole,
  ) {
    return {
      userId,
      academyId,
      branchId,
      role,
    };
  }

  @Get('tasks')
  @Roles(...ADMIN_ROLES)
  listTasks(
    @CurrentUser('sub')
    userId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
    @CurrentUser('role')
    role: AcademyRole,
    @Query('status')
    status?: string,
  ) {
    return this.workflowService.listTasks(
      this.currentUser(
        userId,
        academyId,
        branchId,
        role,
      ),
      status,
    );
  }

  @Post('sync')
  @Roles(...ADMIN_ROLES)
  sync(
    @CurrentUser('sub')
    userId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
    @CurrentUser('role')
    role: AcademyRole,
  ) {
    return this.workflowService.syncTasks(
      this.currentUser(
        userId,
        academyId,
        branchId,
        role,
      ),
    );
  }

  @Post('tasks')
  @Roles(...ADMIN_ROLES)
  createTask(
    @CurrentUser('sub')
    userId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
    @CurrentUser('role')
    role: AcademyRole,
    @Body()
    body: {
      academyId?: string | null;
      branchId?: string | null;
      entityType?: string;
      entityId?: string | null;
      taskType: string;
      title: string;
      description?: string | null;
      status?:
        | 'PENDING'
        | 'READY'
        | 'IN_PROGRESS'
        | 'WAITING_FEEDBACK'
        | 'COMPLETED'
        | 'FAILED'
        | 'CANCELLED'
        | 'ESCALATED';
      priority?: string;
      assignedRole?: string | null;
      assignedUserId?: string | null;
      parentTaskId?: string | null;
      blockedByTaskId?: string | null;
      nextRoute?: string | null;
      dueAt?: string | null;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.workflowService.createTask(
      this.currentUser(
        userId,
        academyId,
        branchId,
        role,
      ),
      body,
    );
  }

  @Patch('tasks/:id/status')
  @Roles(...ADMIN_ROLES)
  updateStatus(
    @CurrentUser('sub')
    userId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
    @CurrentUser('role')
    role: AcademyRole,
    @Param('id')
    taskId: string,
    @Body()
    body: {
      status: string;
      failureReason?: string | null;
    },
  ) {
    return this.workflowService
      .updateTaskStatus(
        this.currentUser(
          userId,
          academyId,
          branchId,
          role,
        ),
        taskId,
        body.status,
        body.failureReason,
      );
  }

  @Post('tasks/:id/escalate')
  @Roles(...ADMIN_ROLES)
  escalate(
    @CurrentUser('sub')
    userId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
    @CurrentUser('role')
    role: AcademyRole,
    @Param('id')
    taskId: string,
    @Body()
    body: {
      reason?: string;
    },
  ) {
    return this.workflowService.escalateTask(
      this.currentUser(
        userId,
        academyId,
        branchId,
        role,
      ),
      taskId,
      body.reason,
    );
  }

  @Post('feedback')
  @Roles(...ALL_ROLES)
  submitFeedback(
    @CurrentUser('sub')
    userId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
    @CurrentUser('role')
    role: AcademyRole,
    @Body()
    body: {
      type?: string;
      subject?: string;
      message: string;
      entityType?: string | null;
      entityId?: string | null;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.workflowService.submitFeedback(
      this.currentUser(
        userId,
        academyId,
        branchId,
        role,
      ),
      body,
    );
  }

  @Get('my-feedback')
  @Roles(...ALL_ROLES)
  myFeedback(
    @CurrentUser('sub')
    userId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
    @CurrentUser('role')
    role: AcademyRole,
  ) {
    return this.workflowService
      .listMyFeedback(
        this.currentUser(
          userId,
          academyId,
          branchId,
          role,
        ),
      );
  }

  @Patch('feedback/:id/resolve')
  @Roles(...ADMIN_ROLES)
  resolveFeedback(
    @CurrentUser('sub')
    userId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
    @CurrentUser('role')
    role: AcademyRole,
    @Param('id')
    feedbackId: string,
    @Body()
    body: {
      response: string;
    },
  ) {
    return this.workflowService
      .resolveFeedback(
        this.currentUser(
          userId,
          academyId,
          branchId,
          role,
        ),
        feedbackId,
        body.response,
      );
  }
}
