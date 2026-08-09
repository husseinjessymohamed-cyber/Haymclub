import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import {
  ConfigService,
} from '@nestjs/config';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import {
  randomUUID,
} from 'node:crypto';

import {
  extname,
} from 'node:path';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;

  private readonly bucket: string | null;

  private readonly region: string;

  private readonly publicBaseUrl: string | null;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.region =
      this.configService.get<string>(
        'AWS_REGION',
      ) ?? 'eu-central-1';

    this.bucket =
      this.configService.get<string>(
        'AWS_S3_BUCKET',
      ) ?? null;

    this.publicBaseUrl =
      this.configService.get<string>(
        'AWS_S3_PUBLIC_BASE_URL',
      ) ?? null;

    this.s3 = new S3Client({
      region: this.region,
    });
  }

  isS3Enabled(): boolean {
    return Boolean(this.bucket);
  }

  async uploadBuffer(input: {
    buffer: Buffer;
    originalName: string;
    contentType: string;
    folder: string;
  }): Promise<{
    key: string;
    url: string;
  }> {
    if (!this.bucket) {
      throw new InternalServerErrorException(
        'AWS_S3_BUCKET is not configured',
      );
    }

    const extension =
      extname(input.originalName)
        .toLowerCase()
        .replace(
          /[^.a-z0-9]/g,
          '',
        );

    const filename =
      `${Date.now()}-${randomUUID()}${extension}`;

    const folder =
      input.folder
        .replace(
          /^\/+|\/+$/g,
          '',
        );

    const key =
      folder
        ? `${folder}/${filename}`
        : filename;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType:
          input.contentType,

        CacheControl:
          'public, max-age=86400',
      }),
    );

    return {
      key,
      url: this.buildUrl(key),
    };
  }

  async headObject(
    key: string,
  ) {
    if (!this.bucket) {
      throw new InternalServerErrorException(
        'AWS_S3_BUCKET is not configured',
      );
    }

    return this.s3.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getObject(
    key: string,
    range?: string,
  ) {
    if (!this.bucket) {
      throw new InternalServerErrorException(
        'AWS_S3_BUCKET is not configured',
      );
    }

    return this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Range: range,
      }),
    );
  }

  async deleteObject(
    key: string,
  ): Promise<void> {
    if (!this.bucket) {
      return;
    }

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  buildUrl(
    key: string,
  ): string {
    if (this.publicBaseUrl) {
      return (
        this.publicBaseUrl
          .replace(/\/+$/, '') +
        '/' +
        key
      );
    }

    if (!this.bucket) {
      throw new InternalServerErrorException(
        'AWS_S3_BUCKET is not configured',
      );
    }

    return (
      `https://${this.bucket}.s3.` +
      `${this.region}.amazonaws.com/${key}`
    );
  }
}
