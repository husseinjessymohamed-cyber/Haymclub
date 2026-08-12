import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import {
  memoryStorage,
} from 'multer';

import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';

import {
  join,
} from 'node:path';

import {
  randomUUID,
} from 'node:crypto';

import type {
  Response,
} from 'express';

import {
  StorageService,
} from '../storage/storage.service';

import {
  Roles,
} from '../auth/decorators/roles.decorator';

import {
  Public,
} from '../auth/decorators/public.decorator';

// HAYMCLUB_PUBLIC_ACADEMY_LOGO_V1

import {
  AcademyRole,
} from '../memberships/entities/academy-membership.entity';

// HAYMCLUB_ACADEMY_LOGO_UPLOAD_V3

const traineeUploadsDirectory =
  join(
    process.cwd(),
    'uploads',
    'trainees',
  );

const academyLogoUploadsDirectory =
  join(
    process.cwd(),
    'uploads',
    'academy-logos',
  );

if (
  !existsSync(
    traineeUploadsDirectory,
  )
) {
  mkdirSync(
    traineeUploadsDirectory,
    {
      recursive: true,
    },
  );
}


if (
  !existsSync(
    academyLogoUploadsDirectory,
  )
) {
  mkdirSync(
    academyLogoUploadsDirectory,
    {
      recursive: true,
    },
  );
}

const allowedMimeTypes:
Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly storageService:
      StorageService,
  ) {}

  @Post('trainee-photo')
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        storage:
          memoryStorage(),

        limits: {
          fileSize:
            5 * 1024 * 1024,

          files: 1,
        },

        fileFilter: (
          _request,
          file,
          callback,
        ) => {
          if (
            !allowedMimeTypes[
              file.mimetype
            ]
          ) {
            callback(
              new BadRequestException(
                'يسمح فقط بصور JPG أو PNG أو WEBP',
              ),
              false,
            );

            return;
          }

          callback(
            null,
            true,
          );
        },
      },
    ),
  )
  async uploadTraineePhoto(
    @UploadedFile()
    file?:
      Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'يرجى اختيار صورة للمتدرب',
      );
    }

    const extension =
      allowedMimeTypes[
        file.mimetype
      ];

    const generatedFilename =
      `${randomUUID()}${extension}`;

    /*
     * Production:
     * عند ضبط AWS_S3_BUCKET
     * يتم الحفظ في S3.
     */
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
              generatedFilename,

            contentType:
              file.mimetype,

            folder:
              'trainees',
          });

      return {
        success: true,

        message:
          'تم رفع صورة المتدرب بنجاح',

        filename:
          uploaded.key
            .split('/')
            .pop(),

        storage:
          'S3',

        key:
          uploaded.key,

        url:
          uploaded.url,

        size:
          file.size,

        mimeType:
          file.mimetype,
      };
    }

    /*
     * Development fallback:
     * إذا لم يتم ضبط S3
     * نحافظ على التخزين المحلي الحالي.
     */
    const localPath =
      join(
        traineeUploadsDirectory,
        generatedFilename,
      );

    writeFileSync(
      localPath,
      file.buffer,
    );

    return {
      success: true,

      message:
        'تم رفع صورة المتدرب بنجاح',

      filename:
        generatedFilename,

      storage:
        'LOCAL',

      url:
        `/api/uploads/trainee-photo/${generatedFilename}`,

      size:
        file.size,

      mimeType:
        file.mimetype,
    };
  }


  @Post('academy-logo')
  @Roles(
    AcademyRole.SUPER_ADMIN,
  )
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        storage:
          memoryStorage(),

        limits: {
          fileSize:
            5 * 1024 * 1024,

          files: 1,
        },

        fileFilter: (
          _request,
          file,
          callback,
        ) => {
          if (
            !allowedMimeTypes[
              file.mimetype
            ]
          ) {
            callback(
              new BadRequestException(
                'يسمح فقط بصور JPG أو PNG أو WEBP',
              ),
              false,
            );

            return;
          }

          callback(
            null,
            true,
          );
        },
      },
    ),
  )
  async uploadAcademyLogo(
    @UploadedFile()
    file?:
      Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'يرجى اختيار شعار الأكاديمية',
      );
    }

    const extension =
      allowedMimeTypes[
        file.mimetype
      ];

    const generatedFilename =
      `${randomUUID()}${extension}`;

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
              generatedFilename,

            contentType:
              file.mimetype,

            folder:
              'academy-logos',
          });

      return {
        success: true,

        message:
          'تم رفع شعار الأكاديمية بنجاح',

        url:
          uploaded.url,

        storage:
          'S3',

        key:
          uploaded.key,

        size:
          file.size,

        mimeType:
          file.mimetype,
      };
    }

    const localPath =
      join(
        academyLogoUploadsDirectory,
        generatedFilename,
      );

    writeFileSync(
      localPath,
      file.buffer,
    );

    return {
      success: true,

      message:
        'تم رفع شعار الأكاديمية بنجاح',

      url:
        `/api/uploads/academy-logo/${generatedFilename}`,

      storage:
        'LOCAL',

      filename:
        generatedFilename,

      size:
        file.size,

      mimeType:
        file.mimetype,
    };
  }


  @Public()
  @Get(
    'academy-logo/:filename',
  )
  showAcademyLogo(
    @Param('filename')
    filename: string,

    @Res()
    response: Response,
  ) {
    const safeFilenamePattern =
      /^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i;

    if (
      !safeFilenamePattern
        .test(filename)
    ) {
      throw new BadRequestException(
        'اسم ملف الشعار غير صالح',
      );
    }

    return response.sendFile(
      filename,
      {
        root:
          academyLogoUploadsDirectory,

        dotfiles:
          'deny',

        headers: {
          'Cache-Control':
            'public, max-age=86400',
        },
      },
    );
  }

  /*
   * يبقى هذا المسار موجودًا
   * للصور المحلية القديمة
   * وللتطوير المحلي.
   *
   * صور S3 الجديدة ترجع URL كامل
   * ولا تحتاج لهذا endpoint.
   */
  @Get(
    'trainee-photo/:filename',
  )
  showTraineePhoto(
    @Param('filename')
    filename: string,

    @Res()
    response: Response,
  ) {
    const safeFilenamePattern =
      /^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i;

    if (
      !safeFilenamePattern
        .test(filename)
    ) {
      throw new BadRequestException(
        'اسم ملف الصورة غير صالح',
      );
    }

    return response.sendFile(
      filename,
      {
        root:
          traineeUploadsDirectory,

        dotfiles:
          'deny',

        headers: {
          'Cache-Control':
            'public, max-age=86400',
        },
      },
    );
  }
}
