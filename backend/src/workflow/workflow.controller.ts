import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AcademyRole } from '../memberships/entities/academy-membership.entity';

import { FileInterceptor } from '@nestjs/platform-express';

import { memoryStorage } from 'multer';

import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';

import { basename, resolve } from 'node:path';

import { randomUUID } from 'node:crypto';

import type { Response } from 'express';

import { DataSource } from 'typeorm';
import { WorkflowService } from './workflow.service';
import { StorageService } from '../storage/storage.service';


// HAYMCLUB_WORKFLOW_IMAGE_UPLOAD
const WORKFLOW_ATTACHMENTS_DIRECTORY = resolve(
  process.cwd(),
  'storage',
  'workflow-feedback',
);

const WORKFLOW_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const ADMIN_ROLES = [
  AcademyRole.SUPER_ADMIN,
  AcademyRole.ACADEMY_ADMIN,
  AcademyRole.BRANCH_MANAGER,
  AcademyRole.RECEPTIONIST,
  AcademyRole.ACCOUNTANT,
  AcademyRole.COACH,
];

const ALL_ROLES = [...ADMIN_ROLES, AcademyRole.PARENT, AcademyRole.TRAINEE];

@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,

    private readonly dataSource: DataSource,

    private readonly storageService: StorageService,
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
      this.currentUser(userId, academyId, branchId, role),
      status,
    );
  }

  @Post('sync')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
  )
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
      this.currentUser(userId, academyId, branchId, role),
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
      this.currentUser(userId, academyId, branchId, role),
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
    return this.workflowService.updateTaskStatus(
      this.currentUser(userId, academyId, branchId, role),
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
      this.currentUser(userId, academyId, branchId, role),
      taskId,
      body.reason,
    );
  }

  @Post('feedback/upload')
  @Roles(...ALL_ROLES)
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: memoryStorage(),

      limits: {
        fileSize: 5 * 1024 * 1024,
      },

      fileFilter: (_request, file, callback) => {
        if (WORKFLOW_IMAGE_EXTENSIONS[file.mimetype]) {
          callback(null, true);
          return;
        }

        callback(
          new BadRequestException('يسمح برفع صور JPG أو PNG أو WEBP فقط.'),
          false,
        );
      },
    }),
  )
  async submitFeedbackWithImage(
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
      metadata?: string;
    },

    @UploadedFile()
    file?: Express.Multer.File,
  ) {
    let metadata:
      Record<string, unknown> = {};

    if (
      body.metadata?.trim()
    ) {
      try {
        const parsed =
          JSON.parse(
            body.metadata,
          );

        if (
          typeof parsed !==
            'object' ||
          parsed === null ||
          Array.isArray(
            parsed,
          )
        ) {
          throw new Error(
            'Metadata must be an object',
          );
        }

        metadata =
          parsed as Record<
            string,
            unknown
          >;
      } catch {
        throw new BadRequestException(
          'بيانات الطلب المرفقة غير صحيحة.',
        );
      }
    }

    let stored:
      {
        provider:
          'S3' | 'LOCAL';

        key:
          string;

        fileName:
          string;

        url:
          string | null;
      } |
      null = null;

    if (file) {
      const extension =
        WORKFLOW_IMAGE_EXTENSIONS[
          file.mimetype
        ];

      if (!extension) {
        throw new BadRequestException(
          'يسمح برفع صور JPG أو PNG أو WEBP فقط.',
        );
      }

      if (
        this.storageService
          .isS3Enabled()
      ) {
        const uploaded =
          await this.storageService
            .uploadBuffer({
              buffer:
                file.buffer,

              originalName:
                file.originalname,

              contentType:
                file.mimetype,

              folder:
                academyId
                  ? `workflow-feedback/${academyId}`
                  : 'workflow-feedback/global',
            });

        stored = {
          provider:
            'S3',

          key:
            uploaded.key,

          fileName:
            uploaded.key
              .split('/')
              .pop() ??
            uploaded.key,

          url:
            uploaded.url,
        };
      } else {
        mkdirSync(
          WORKFLOW_ATTACHMENTS_DIRECTORY,
          {
            recursive: true,
          },
        );

        const filename =
          `${randomUUID()}${extension}`;

        const filePath =
          resolve(
            WORKFLOW_ATTACHMENTS_DIRECTORY,
            filename,
          );

        writeFileSync(
          filePath,
          file.buffer,
        );

        stored = {
          provider:
            'LOCAL',

          key:
            filename,

          fileName:
            filename,

          url:
            null,
        };
      }

      metadata = {
        ...metadata,

        attachment: {
          storageProvider:
            stored.provider,

          storageKey:
            stored.key,

          storageUrl:
            stored.url,

          fileName:
            stored.fileName,

          originalName:
            file.originalname,

          mimeType:
            file.mimetype,

          size:
            file.size,
        },
      };
    }

    try {
      return await this.workflowService
        .submitFeedback(
          this.currentUser(
            userId,
            academyId,
            branchId,
            role,
          ),
          {
            type:
              body.type,

            subject:
              body.subject,

            message:
              body.message,

            entityType:
              body.entityType,

            entityId:
              body.entityId,

            metadata,
          },
        );
    } catch (error) {
      /*
       * Rollback للملف إذا فشل
       * حفظ الـ Feedback.
       */
      if (stored) {
        try {
          if (
            stored.provider ===
              'S3'
          ) {
            await this.storageService
              .deleteObject(
                stored.key,
              );
          } else {
            const filePath =
              resolve(
                WORKFLOW_ATTACHMENTS_DIRECTORY,
                basename(
                  stored.key,
                ),
              );

            if (
              existsSync(
                filePath,
              )
            ) {
              unlinkSync(
                filePath,
              );
            }
          }
        } catch {
          // لا نخفي الخطأ الأصلي.
        }
      }

      throw error;
    }
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
      this.currentUser(userId, academyId, branchId, role),
      body,
    );
  }

  @Get('feedback/admin')
  @Roles(...ADMIN_ROLES)
  async listAcademyFeedback(
    @CurrentUser('academyId')
    academyId: string | null,

    @CurrentUser('branchId')
    branchId: string | null,

    @CurrentUser('role')
    role: AcademyRole,
  ) {
    const academyFilter = role === AcademyRole.SUPER_ADMIN ? null : academyId;

    if (role !== AcademyRole.SUPER_ADMIN && !academyFilter) {
      return [];
    }

    const branchRestricted =
      role === AcademyRole.BRANCH_MANAGER ||
      role === AcademyRole.RECEPTIONIST ||
      role === AcademyRole.ACCOUNTANT ||
      role === AcademyRole.COACH;

    if (branchRestricted && !branchId) {
      throw new ForbiddenException('Branch context is required');
    }

    const branchFilter = branchRestricted ? branchId : null;

    return this.dataSource.query(
      `
        SELECT
          feedback.*,

          CONCAT_WS(
            ' ',
            creator.first_name,
            creator.last_name
          ) AS creator_name,

          creator.email
            AS creator_email,

          branch.name
            AS branch_name

        FROM workflow_feedback
          AS feedback

        LEFT JOIN users
          AS creator
          ON creator.id =
            feedback.created_by

        LEFT JOIN branches
          AS branch
          ON branch.id =
            feedback.branch_id

        WHERE
          (
            $1::uuid IS NULL
            OR feedback.academy_id =
              $1
          )

          AND (
            $2::uuid IS NULL
            OR feedback.branch_id =
              $2
          )

        ORDER BY
          CASE
            WHEN feedback.status =
              'OPEN'
            THEN 1

            WHEN feedback.status =
              'RESOLVED'
            THEN 2

            ELSE 3
          END,

          feedback.created_at DESC
      `,
      [academyFilter, branchFilter],
    );
  }

  @Get('feedback/:id/attachment')
  @Roles(...ALL_ROLES)
  async streamFeedbackAttachment(
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

    @Res()
    response: Response,
  ): Promise<void> {
    const rows = (await this.dataSource.query(
      `
          SELECT
            id,
            academy_id,
            branch_id,
            created_by,
            metadata

          FROM workflow_feedback

          WHERE id = $1

          LIMIT 1
        `,
      [feedbackId],
    )) as Array<{
      id: string;
      academy_id: string | null;
      branch_id: string | null;
      created_by: string;
      metadata: Record<string, unknown> | string | null;
    }>;

    const feedback = rows[0];

    if (!feedback) {
      throw new NotFoundException('الطلب غير موجود.');
    }

    const clientRole =
      role === AcademyRole.PARENT || role === AcademyRole.TRAINEE;

    if (clientRole && feedback.created_by !== userId) {
      throw new ForbiddenException('لا يمكنك فتح هذا المرفق.');
    }

    if (
      !clientRole &&
      role !== AcademyRole.SUPER_ADMIN &&
      feedback.academy_id !== academyId
    ) {
      throw new ForbiddenException('لا يمكنك فتح هذا المرفق.');
    }

    const branchRestricted =
      role === AcademyRole.BRANCH_MANAGER ||
      role === AcademyRole.RECEPTIONIST ||
      role === AcademyRole.ACCOUNTANT ||
      role === AcademyRole.COACH;

    if (branchRestricted && !branchId) {
      throw new ForbiddenException('Branch context is required');
    }

    if (branchRestricted && feedback.branch_id !== branchId) {
      throw new ForbiddenException('لا يمكنك فتح مرفق فرع آخر.');
    }

    let metadata = feedback.metadata;

    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        metadata = null;
      }
    }

    const attachment =
      metadata && typeof metadata === 'object'
        ? (
            metadata as {
              attachment?: {
                fileName?: unknown;
                originalName?: unknown;
                mimeType?: unknown;
              };
            }
          ).attachment
        : undefined;

    const fileName =
      typeof attachment?.fileName === 'string' ? attachment.fileName : '';

    if (!fileName || basename(fileName) !== fileName) {
      throw new NotFoundException('لا توجد صورة مرفقة بهذا الطلب.');
    }

    const filePath = resolve(WORKFLOW_ATTACHMENTS_DIRECTORY, fileName);

    if (!existsSync(filePath)) {
      throw new NotFoundException('ملف الصورة غير موجود.');
    }

    const mimeType =
      typeof attachment?.mimeType === 'string'
        ? attachment.mimeType
        : 'application/octet-stream';

    const originalName =
      typeof attachment?.originalName === 'string'
        ? attachment.originalName
        : fileName;

    response.setHeader('Content-Type', mimeType);

    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`,
    );

    response.setHeader('Cache-Control', 'private, max-age=300');

    createReadStream(filePath).pipe(response);
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
    return this.workflowService.listMyFeedback(
      this.currentUser(userId, academyId, branchId, role),
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
    return this.workflowService.resolveFeedback(
      this.currentUser(userId, academyId, branchId, role),
      feedbackId,
      body.response,
    );
  }
}
