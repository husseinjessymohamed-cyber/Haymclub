import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import {
  randomUUID,
} from 'crypto';

import type {
  Request,
  Response,
} from 'express';

import {
  createReadStream,
  mkdirSync,
  statSync,
} from 'fs';

import {
  diskStorage,
} from 'multer';

import {
  join,
} from 'path';

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
  CreateGalleryItemDto,
} from './dto/create-gallery-item.dto';

import {
  GalleryMediaType,
} from './entities/gallery-item.entity';

import {
  GalleryService,
} from './gallery.service';

const GALLERY_DIRECTORY =
  join(
    process.cwd(),
    'storage',
    'gallery',
  );

const MIME_EXTENSIONS:
Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

const ALLOWED_MIME_TYPES =
  new Set(
    Object.keys(
      MIME_EXTENSIONS,
    ),
  );

const ADMIN_ROLES = [
  AcademyRole.ACADEMY_ADMIN,
  AcademyRole.BRANCH_MANAGER,
  AcademyRole.RECEPTIONIST,
  AcademyRole.COACH,
];

const VIEW_ROLES = [
  ...ADMIN_ROLES,
  AcademyRole.ACCOUNTANT,
  AcademyRole.PARENT,
  AcademyRole.TRAINEE,
];

@Controller('gallery')
export class GalleryController {
  constructor(
    private readonly galleryService:
      GalleryService,
  ) {}

  @Post('upload')
  @Roles(...ADMIN_ROLES)
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        storage: diskStorage({
          destination: (
            _request,
            _file,
            callback,
          ) => {
            mkdirSync(
              GALLERY_DIRECTORY,
              {
                recursive: true,
              },
            );

            callback(
              null,
              GALLERY_DIRECTORY,
            );
          },

          filename: (
            _request,
            file,
            callback,
          ) => {
            const extension =
              MIME_EXTENSIONS[
                file.mimetype
              ] ?? '';

            callback(
              null,
              `${randomUUID()}${extension}`,
            );
          },
        }),

        fileFilter: (
          _request,
          file,
          callback,
        ) => {
          if (
            !ALLOWED_MIME_TYPES
              .has(file.mimetype)
          ) {
            callback(
              new BadRequestException(
                'نوع الملف غير مسموح.',
              ),
              false,
            );

            return;
          }

          callback(null, true);
        },

        limits: {
          fileSize:
            25 * 1024 * 1024,
          files: 1,
        },
      },
    ),
  )
  create(
    @CurrentUser('academyId')
    academyId: string | null,

    @CurrentUser('sub')
    userId: string,

    @Body()
    dto: CreateGalleryItemDto,

    @UploadedFile()
    file:
      Express.Multer.File |
      undefined,
  ) {
    return this.galleryService
      .create(
        academyId,
        userId,
        dto,
        file,
      );
  }

  @Get('admin')
  @Roles(...ADMIN_ROLES)
  findAdminItems(
    @CurrentUser('academyId')
    academyId: string | null,
  ) {
    return this.galleryService
      .findAll(academyId);
  }

  @Get('my')
  @Roles(
    AcademyRole.PARENT,
    AcademyRole.TRAINEE,
  )
  findMyItems(
    @CurrentUser('academyId')
    academyId: string | null,
  ) {
    return this.galleryService
      .findAll(academyId);
  }

  @Get('file/:id')
  @Roles(...VIEW_ROLES)
  async streamFile(
    @Param(
      'id',
      new ParseUUIDPipe(),
    )
    id: string,

    @CurrentUser('academyId')
    academyId: string | null,

    @Req()
    request: Request,

    @Res()
    response: Response,
  ): Promise<void> {
    const {
      item,
      filePath,
    } =
      await this.galleryService
        .findFile(
          id,
          academyId,
        );

    const stats =
      statSync(filePath);

    const range =
      request.headers.range;

    response.setHeader(
      'Content-Type',
      item.mimeType,
    );

    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(
        item.originalName,
      )}`,
    );

    response.setHeader(
      'Cache-Control',
      'private, max-age=3600',
    );

    if (
      item.mediaType ===
        GalleryMediaType.VIDEO &&
      range
    ) {
      const [
        startText,
        endText,
      ] = range
        .replace('bytes=', '')
        .split('-');

      const start =
        Number.parseInt(
          startText,
          10,
        );

      const requestedEnd =
        endText
          ? Number.parseInt(
              endText,
              10,
            )
          : stats.size - 1;

      const end = Math.min(
        requestedEnd,
        stats.size - 1,
      );

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        start > end ||
        start >= stats.size
      ) {
        response.status(416);

        response.setHeader(
          'Content-Range',
          `bytes */${stats.size}`,
        );

        response.end();
        return;
      }

      const contentLength =
        end - start + 1;

      response.status(206);

      response.setHeader(
        'Accept-Ranges',
        'bytes',
      );

      response.setHeader(
        'Content-Range',
        `bytes ${start}-${end}/${stats.size}`,
      );

      response.setHeader(
        'Content-Length',
        contentLength,
      );

      createReadStream(
        filePath,
        {
          start,
          end,
        },
      ).pipe(response);

      return;
    }

    response.setHeader(
      'Content-Length',
      stats.size,
    );

    if (
      item.mediaType ===
      GalleryMediaType.VIDEO
    ) {
      response.setHeader(
        'Accept-Ranges',
        'bytes',
      );
    }

    createReadStream(
      filePath,
    ).pipe(response);
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  remove(
    @Param(
      'id',
      new ParseUUIDPipe(),
    )
    id: string,

    @CurrentUser('academyId')
    academyId: string | null,
  ) {
    return this.galleryService
      .remove(
        id,
        academyId,
      );
  }
}
