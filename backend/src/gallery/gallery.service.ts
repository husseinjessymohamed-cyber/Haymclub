import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  randomUUID,
} from 'crypto';

import {
  existsSync,
} from 'fs';

import {
  unlink,
} from 'fs/promises';

import {
  basename,
  join,
} from 'path';

import {
  Repository,
} from 'typeorm';

import {
  CreateGalleryItemDto,
} from './dto/create-gallery-item.dto';

import {
  GalleryItem,
  GalleryMediaType,
} from './entities/gallery-item.entity';

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
]);

const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;

const MAX_VIDEO_SIZE =
  25 * 1024 * 1024;

export interface GalleryFileResult {
  item: GalleryItem;
  filePath: string;
}

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(GalleryItem)
    private readonly galleryRepository:
      Repository<GalleryItem>,
  ) {}

  async create(
    academyId: string | null,
    uploadedByUserId: string,
    dto: CreateGalleryItemDto,
    file: Express.Multer.File | undefined,
  ): Promise<GalleryItem> {
    if (!academyId) {
      await this.deleteUploadedFile(
        file,
      );

      throw new ForbiddenException(
        'لا توجد أكاديمية مرتبطة بالحساب.',
      );
    }

    if (!file) {
      throw new BadRequestException(
        'يجب اختيار صورة أو فيديو.',
      );
    }

    let mediaType:
      GalleryMediaType;

    if (IMAGE_TYPES.has(file.mimetype)) {
      mediaType =
        GalleryMediaType.IMAGE;

      if (
        file.size >
        MAX_IMAGE_SIZE
      ) {
        await this.deleteUploadedFile(
          file,
        );

        throw new BadRequestException(
          'حجم الصورة يجب ألا يتجاوز 5MB.',
        );
      }
    } else if (
      VIDEO_TYPES.has(file.mimetype)
    ) {
      mediaType =
        GalleryMediaType.VIDEO;

      if (
        file.size >
        MAX_VIDEO_SIZE
      ) {
        await this.deleteUploadedFile(
          file,
        );

        throw new BadRequestException(
          'حجم الفيديو يجب ألا يتجاوز 25MB.',
        );
      }
    } else {
      await this.deleteUploadedFile(
        file,
      );

      throw new BadRequestException(
        'يسمح بصور JPG وPNG وWEBP وفيديو MP4 أو WEBM فقط.',
      );
    }

    const item =
      this.galleryRepository.create({
        id: randomUUID(),
        academyId,
        uploadedByUserId,
        title: dto.title.trim(),
        description:
          dto.description?.trim() ||
          null,
        mediaType,
        fileName:
          basename(file.filename),
        originalName:
          file.originalname.slice(
            0,
            255,
          ),
        mimeType: file.mimetype,
        size: file.size,
        publishedAt: new Date(),
      });

    try {
      return await this.galleryRepository
        .save(item);
    } catch (error) {
      await this.deleteUploadedFile(
        file,
      );

      throw error;
    }
  }

  async findAll(
    academyId: string | null,
  ): Promise<GalleryItem[]> {
    if (!academyId) {
      return [];
    }

    return this.galleryRepository.find({
      where: {
        academyId,
      },

      order: {
        publishedAt: 'DESC',
      },

      take: 100,
    });
  }

  async findFile(
    id: string,
    academyId: string | null,
  ): Promise<GalleryFileResult> {
    const item =
      await this.findAccessibleItem(
        id,
        academyId,
      );

    const filePath = join(
      this.galleryDirectory(),
      basename(item.fileName),
    );

    if (!existsSync(filePath)) {
      throw new NotFoundException(
        'ملف المعرض غير موجود على الخادم.',
      );
    }

    return {
      item,
      filePath,
    };
  }

  async remove(
    id: string,
    academyId: string | null,
  ): Promise<{ message: string }> {
    const item =
      await this.findAccessibleItem(
        id,
        academyId,
      );

    const filePath = join(
      this.galleryDirectory(),
      basename(item.fileName),
    );

    await this.galleryRepository
      .softDelete(item.id);

    try {
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch {
      // تم حذف السجل حتى لو تعذر حذف الملف.
    }

    return {
      message:
        'تم حذف العنصر من المعرض.',
    };
  }

  private async findAccessibleItem(
    id: string,
    academyId: string | null,
  ): Promise<GalleryItem> {
    if (!academyId) {
      throw new NotFoundException(
        'عنصر المعرض غير موجود.',
      );
    }

    const item =
      await this.galleryRepository
        .findOne({
          where: {
            id,
            academyId,
          },
        });

    if (!item) {
      throw new NotFoundException(
        'عنصر المعرض غير موجود.',
      );
    }

    return item;
  }

  private galleryDirectory():
  string {
    return join(
      process.cwd(),
      'storage',
      'gallery',
    );
  }

  private async deleteUploadedFile(
    file:
      Express.Multer.File |
      undefined,
  ): Promise<void> {
    if (!file?.path) {
      return;
    }

    try {
      if (existsSync(file.path)) {
        await unlink(file.path);
      }
    } catch {
      // لا نوقف الطلب بسبب فشل تنظيف ملف مؤقت.
    }
  }
}
