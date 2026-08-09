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

const traineeUploadsDirectory =
  join(
    process.cwd(),
    'uploads',
    'trainees',
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
