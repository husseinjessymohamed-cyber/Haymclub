import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';

import { DataSource } from 'typeorm';

import { WorkflowService } from './workflow.service';

@Injectable()
export class WorkflowAutomationService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger =
    new Logger(WorkflowAutomationService.name);

  private interval:
    ReturnType<typeof setInterval> | null = null;

  private startupTimer:
    ReturnType<typeof setTimeout> | null = null;

  private running = false;

  private readonly intervalMs =
    Math.max(
      15_000,
      Number(
        process.env.WORKFLOW_AUTOMATION_INTERVAL_MS ??
        30_000,
      ),
    );

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly dataSource: DataSource,
  ) {}

  onApplicationBootstrap(): void {
    this.logger.log(
      `Hidden workflow automation enabled every ${this.intervalMs}ms`,
    );

    this.startupTimer = setTimeout(() => {
      void this.runCycle();
    }, 5_000);

    this.interval = setInterval(() => {
      void this.runCycle();
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async applyInternalState(): Promise<void> {
    await this.dataSource.query(`
      UPDATE workflow_tasks
      SET
        metadata =
          COALESCE(metadata, '{}'::jsonb) ||
          jsonb_build_object(
            'hidden', TRUE,
            'automationMode', 'SYSTEM'
          ),
        updated_at = NOW()
      WHERE
        COALESCE(metadata->>'hidden', 'false') <> 'true'
        OR COALESCE(metadata->>'automationMode', '') <> 'SYSTEM'
    `);

    await this.dataSource.query(`
      UPDATE workflow_tasks AS task
      SET
        status = 'READY',
        blocked_by_task_id = NULL,
        updated_at = NOW()
      FROM workflow_tasks AS blocker
      WHERE
        task.blocked_by_task_id = blocker.id
        AND task.status = 'PENDING'
        AND blocker.status = 'COMPLETED'
    `);
  }

  private errorText(error: unknown): string {
    return error instanceof Error
      ? error.stack ?? error.message
      : String(error);
  }

  private async runCycle(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      /*
       * نخفي السجلات أولًا؛ حتى لو فشلت مزامنة
       * إحدى الوحدات تظل شجرة المهام غير ظاهرة.
       */
      await this.applyInternalState();

      try {
        await this.workflowService.syncTasks({
          userId: null,
          role: 'SUPER_ADMIN',
          academyId: null,
          branchId: null,
        } as any);
      } catch (error) {
        this.logger.error(
          'Automatic workflow data synchronization failed',
          this.errorText(error),
        );
      }

      /*
       * المزامنة قد تنشئ سجلات جديدة،
       * لذلك نطبق حالة الإخفاء مرة ثانية.
       */
      await this.applyInternalState();

      this.logger.log(
        'Hidden workflow synchronization completed',
      );
    } catch (error) {
      this.logger.error(
        'Hidden workflow internal update failed',
        this.errorText(error),
      );
    } finally {
      this.running = false;
    }
  }
}
