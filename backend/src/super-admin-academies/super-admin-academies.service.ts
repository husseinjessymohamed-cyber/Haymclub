import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { randomUUID } from 'crypto';

import { DataSource } from 'typeorm';

import { CreateSuperAdminAcademyDto } from './dto/create-super-admin-academy.dto';

interface ColumnInformation {
  column_name: string;
  is_nullable: string;
  column_default: string | null;
  data_type: string;
  udt_name: string;
}

@Injectable()
export class SuperAdminAcademiesService {
  constructor(private readonly dataSource: DataSource) {}

  async createAcademy(dto: CreateSuperAdminAcademyDto) {
    const table = await this.resolveAcademiesTable();

    if (!table) {
      throw new InternalServerErrorException('Academies table was not found');
    }

    const columns = await this.getColumns(table);

    const slugColumn = this.findColumn(columns, ['slug']);

    const emailColumn = this.findColumn(columns, ['email']);

    const slug = this.createSlug(dto.slug ?? dto.name);

    if (slugColumn) {
      const existing = await this.dataSource.query(
        `
            SELECT 1
            FROM ${this.quote(table)}
            WHERE LOWER(
              ${this.quote(slugColumn.column_name)}::text
            ) = LOWER($1)
            LIMIT 1
          `,
        [slug],
      );

      if (existing.length > 0) {
        throw new ConflictException('رابط الأكاديمية مستخدم بالفعل');
      }
    }

    if (emailColumn && dto.email) {
      const existingEmail = await this.dataSource.query(
        `
            SELECT 1
            FROM ${this.quote(table)}
            WHERE LOWER(
              ${this.quote(emailColumn.column_name)}::text
            ) = LOWER($1)
            LIMIT 1
          `,
        [dto.email],
      );

      if (existingEmail.length > 0) {
        throw new ConflictException('البريد مستخدم في أكاديمية أخرى');
      }
    }

    const values = new Map<string, unknown>();

    const setCandidate = (candidates: string[], value: unknown) => {
      const column = this.findColumn(columns, candidates);

      if (column) {
        values.set(column.column_name, value);
      }
    };

    setCandidate(['id'], randomUUID());

    setCandidate(['name'], dto.name);

    setCandidate(['legalName', 'legal_name'], dto.legalName ?? dto.name);

    setCandidate(['slug'], slug);

    setCandidate(['email'], dto.email ?? null);

    setCandidate(['phone'], dto.phone ?? null);

    const statusColumn = this.findColumn(columns, ['status']);

    if (statusColumn) {
      values.set(
        statusColumn.column_name,
        await this.resolveStatus(statusColumn, dto.status ?? 'ACTIVE'),
      );
    }

    setCandidate(['isActive', 'is_active'], dto.status !== 'SUSPENDED');

    setCandidate(['country'], 'EG');

    setCandidate(['currency'], 'EGP');

    setCandidate(['timezone'], 'Africa/Cairo');

    setCandidate(['locale', 'language'], 'ar');

    setCandidate(
      ['attendanceEnabled', 'attendance_enabled'],
      dto.attendanceEnabled ?? false,
    );

    setCandidate(
      ['notificationsEnabled', 'notifications_enabled'],
      dto.notificationsEnabled ?? false,
    );

    setCandidate(
      ['rankingsEnabled', 'rankings_enabled'],
      dto.rankingsEnabled ?? false,
    );

    setCandidate(
      ['galleryEnabled', 'gallery_enabled'],
      dto.galleryEnabled ?? false,
    );

    setCandidate(
      ['subscriptionsEnabled', 'subscriptions_enabled'],
      dto.subscriptionsEnabled ?? false,
    );

    setCandidate(
      ['reportsEnabled', 'reports_enabled'],
      dto.reportsEnabled ?? false,
    );


    setCandidate(['createdAt', 'created_at'], new Date());

    setCandidate(['updatedAt', 'updated_at'], new Date());

    setCandidate(['deletedAt', 'deleted_at'], null);

    const missingRequired = columns.filter(
      (column) =>
        column.is_nullable === 'NO' &&
        column.column_default === null &&
        !values.has(column.column_name),
    );

    if (missingRequired.length > 0) {
      throw new BadRequestException(
        'أعمدة مطلوبة غير مجهزة: ' +
          missingRequired.map((column) => column.column_name).join(', '),
      );
    }

    const entries = [...values.entries()];

    if (entries.length === 0) {
      throw new InternalServerErrorException(
        'No insertable academy fields found',
      );
    }

    const columnSql = entries.map(([column]) => this.quote(column)).join(', ');

    const parameterSql = entries.map((_, index) => `$${index + 1}`).join(', ');

    const result = await this.dataSource.query(
      `
          INSERT INTO ${this.quote(table)}
          (${columnSql})
          VALUES (${parameterSql})
          RETURNING *
        `,
      entries.map(([, value]) => value),
    );

    return result[0];
  }

  private async resolveAcademiesTable(): Promise<string | null> {
    const rows = (await this.dataSource.query(
      `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema =
            current_schema()
            AND table_type =
              'BASE TABLE'
        `,
    )) as Array<{
      table_name: string;
    }>;

    const map = new Map(
      rows.map((row) => [row.table_name.toLowerCase(), row.table_name]),
    );

    return map.get('academies') ?? map.get('academy') ?? null;
  }

  private async getColumns(table: string): Promise<ColumnInformation[]> {
    return this.dataSource.query(
      `
        SELECT
          column_name,
          is_nullable,
          column_default,
          data_type,
          udt_name
        FROM information_schema.columns
        WHERE table_schema =
          current_schema()
          AND table_name = $1
        ORDER BY ordinal_position
      `,
      [table],
    ) as Promise<ColumnInformation[]>;
  }

  private findColumn(
    columns: ColumnInformation[],
    candidates: string[],
  ): ColumnInformation | null {
    const map = new Map(
      columns.map((column) => [column.column_name.toLowerCase(), column]),
    );

    for (const candidate of candidates) {
      const column = map.get(candidate.toLowerCase());

      if (column) {
        return column;
      }
    }

    return null;
  }

  private async resolveStatus(
    column: ColumnInformation,
    requested: string,
  ): Promise<string> {
    if (column.data_type !== 'USER-DEFINED') {
      return requested;
    }

    const rows = (await this.dataSource.query(
      `
          SELECT enumlabel
          FROM pg_enum
          INNER JOIN pg_type
            ON pg_type.oid =
              pg_enum.enumtypid
          WHERE pg_type.typname = $1
          ORDER BY pg_enum.enumsortorder
        `,
      [column.udt_name],
    )) as Array<{
      enumlabel: string;
    }>;

    const values = rows.map((row) => row.enumlabel);

    if (values.includes(requested)) {
      return requested;
    }

    if (values.includes('ACTIVE')) {
      return 'ACTIVE';
    }

    return values[0] ?? requested;
  }

  private createSlug(value: string): string {
    const result = value
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90);

    return result || `academy-${Date.now()}`;
  }

  private quote(identifier: string): string {
    return '"' + identifier.replace(/"/g, '""') + '"';
  }
}
