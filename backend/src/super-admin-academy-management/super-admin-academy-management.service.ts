import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, } from '@nestjs/common';

import { hash } from 'bcrypt';

import { randomUUID } from 'crypto';

import { DataSource } from 'typeorm';

import { CreateAcademyManagerDto } from './dto/create-academy-manager.dto';

import { CreateMainBranchDto } from './dto/create-main-branch.dto';

import { UpdateSuperAdminAcademyDto } from './dto/update-academy.dto';

interface SqlExecutor {
  query(query: string, parameters?: any[]): Promise<any>;
}

interface ColumnInfo {
  column_name: string;
  is_nullable: string;
  column_default: string | null;
  data_type: string;
  udt_name: string;
}

type DatabaseRow = Record<string, any>;

@Injectable()
export class SuperAdminAcademyManagementService {
  constructor(private readonly dataSource: DataSource) {}

  async getDetails(academyId: string) {
    const academy = await this.getAcademy(this.dataSource, academyId);

    const [branches, managers] = await Promise.all([
      this.findBranches(this.dataSource, academyId),

      this.findManagers(this.dataSource, academyId),
    ]);

    return {
      academy,
      branches,
      managers,
    };
  }

  async updateAcademy(academyId: string, dto: UpdateSuperAdminAcademyDto) {
    return this.dataSource.transaction(async (manager) => {
      const table = await this.requireTable(
        manager,
        ['academies', 'academy'],
        'جدول الأكاديميات غير موجود',
      );

      const columns = await this.getColumns(manager, table);

      const idColumn = this.requireColumn(
        columns,
        ['id'],
        'عمود معرف الأكاديمية غير موجود',
      );

      await this.getAcademy(manager, academyId);

      if (dto.slug) {
        await this.assertUnique(
          manager,
          table,
          columns,
          'slug',
          this.slugify(dto.slug),
          academyId,
          'الرابط المختصر مستخدم بالفعل',
        );
      }

      if (dto.email) {
        await this.assertUnique(
          manager,
          table,
          columns,
          'email',
          dto.email,
          academyId,
          'البريد مستخدم في أكاديمية أخرى',
        );
      }

      const values = new Map<string, unknown>();

      if (dto.name !== undefined) {
        this.setValue(values, columns, ['name'], dto.name);
      }

      if (dto.legalName !== undefined) {
        this.setValue(
          values,
          columns,
          ['legalName', 'legal_name'],
          dto.legalName || null,
        );
      }

      if (dto.slug !== undefined) {
        this.setValue(values, columns, ['slug'], this.slugify(dto.slug));
      }

      if (dto.email !== undefined) {
        this.setValue(values, columns, ['email'], dto.email || null);
      }

      if (dto.phone !== undefined) {
        this.setValue(values, columns, ['phone'], dto.phone || null);
      }

      if (dto.country !== undefined) {
        this.setValue(values, columns, ['country'], dto.country);
      }

      if (dto.currency !== undefined) {
        this.setValue(values, columns, ['currency'], dto.currency);
      }

      if (dto.timezone !== undefined) {
        this.setValue(values, columns, ['timezone'], dto.timezone);
      }

      if (dto.locale !== undefined) {
        this.setValue(values, columns, ['locale', 'language'], dto.locale);
      }

      if (dto.attendanceEnabled !== undefined) {
        this.setValue(
          values,
          columns,
          ['attendanceEnabled', 'attendance_enabled'],
          dto.attendanceEnabled,
        );
      }

      if (dto.notificationsEnabled !== undefined) {
        this.setValue(
          values,
          columns,
          ['notificationsEnabled', 'notifications_enabled'],
          dto.notificationsEnabled,
        );
      }

      if (dto.rankingsEnabled !== undefined) {
        this.setValue(
          values,
          columns,
          ['rankingsEnabled', 'rankings_enabled'],
          dto.rankingsEnabled,
        );
      }

      if (dto.galleryEnabled !== undefined) {
        this.setValue(
          values,
          columns,
          ['galleryEnabled', 'gallery_enabled'],
          dto.galleryEnabled,
        );
      }

      if (dto.subscriptionsEnabled !== undefined) {
        this.setValue(
          values,
          columns,
          ['subscriptionsEnabled', 'subscriptions_enabled'],
          dto.subscriptionsEnabled,
        );
      }

      if (dto.reportsEnabled !== undefined) {
        this.setValue(
          values,
          columns,
          ['reportsEnabled', 'reports_enabled'],
          dto.reportsEnabled,
        );
      }

      if (dto.status !== undefined) {
        await this.setStatusValues(manager, values, columns, dto.status);
      }

      this.setUpdatedAt(values, columns);

      return this.updateRow(
        manager,
        table,
        idColumn.column_name,
        academyId,
        values,
      );
    });
  }

  async updateStatus(academyId: string, status: string) {
    return this.dataSource.transaction(async (manager) => {
      const table = await this.requireTable(
        manager,
        ['academies', 'academy'],
        'جدول الأكاديميات غير موجود',
      );

      const columns = await this.getColumns(manager, table);

      const idColumn = this.requireColumn(
        columns,
        ['id'],
        'عمود معرف الأكاديمية غير موجود',
      );

      await this.getAcademy(manager, academyId);

      const values = new Map<string, unknown>();

      await this.setStatusValues(manager, values, columns, status);

      this.setUpdatedAt(values, columns);

      return this.updateRow(
        manager,
        table,
        idColumn.column_name,
        academyId,
        values,
      );
    });
  }

  async ensureMainBranch(academyId: string, dto: CreateMainBranchDto) {
    return this.dataSource.transaction(async (manager) => {
      const academy = await this.getAcademy(manager, academyId);

      return this.ensureBranch(
        manager,
        academyId,
        String(academy.name ?? 'الأكاديمية'),
        dto,
      );
    });
  }

  async createManager(academyId: string, dto: CreateAcademyManagerDto) {
    return this.dataSource.transaction(async (manager) => {
      const academy = await this.getAcademy(manager, academyId);

      const usersTable = await this.requireTable(
        manager,
        ['users', 'user'],
        'جدول المستخدمين غير موجود',
      );

      const userColumns = await this.getColumns(manager, usersTable);

      const emailColumn = this.requireColumn(
        userColumns,
        ['email'],
        'عمود البريد غير موجود',
      );

      const duplicate = await manager.query(
        `
                SELECT 1
                FROM ${this.quote(usersTable)}
                WHERE LOWER(
                  ${this.quote(emailColumn.column_name)}::text
                ) = LOWER($1)
                LIMIT 1
              `,
        [dto.email],
      );

      if (duplicate.length > 0) {
        throw new ConflictException('البريد مستخدم في حساب آخر');
      }

      let branchId = dto.branchId ?? null;

      if (!branchId) {
        const branch = await this.ensureBranch(
          manager,
          academyId,
          String(academy.name ?? 'الأكاديمية'),
          {},
        );

        branchId = branch.id ? String(branch.id) : null;
      }

      /*
       * قيمة داخلية عشوائية فقط لاستيفاء
       * عمود password_hash.
       * السوبر أدمن لا يراها ولا يستخدمها.
       */
      const passwordHash =
        await hash(
          `${randomUUID()}${randomUUID()}Aa1!`,
          12,
        );

      const userValues = new Map<string, unknown>();

      this.setValue(userValues, userColumns, ['id'], randomUUID());

      this.setValue(
        userValues,
        userColumns,
        ['firstName', 'first_name'],
        dto.firstName,
      );

      this.setValue(
        userValues,
        userColumns,
        ['lastName', 'last_name'],
        dto.lastName,
      );

      this.setValue(
        userValues,
        userColumns,
        ['name', 'fullName', 'full_name'],
        `${dto.firstName} ${dto.lastName}`,
      );

      this.setValue(userValues, userColumns, ['email'], dto.email);

      this.setValue(userValues, userColumns, ['phone'], dto.phone ?? null);

      this.setValue(
        userValues,
        userColumns,
        ['passwordHash', 'password_hash', 'password'],
        passwordHash,
      );

      const statusColumn = this.findColumn(userColumns, ['status']);

      if (statusColumn) {
        userValues.set(
          statusColumn.column_name,
          await this.enumValue(manager, statusColumn, 'ACTIVE', [
            'ACTIVE',
            'ENABLED',
          ]),
        );
      }

      this.setValue(userValues, userColumns, ['isActive', 'is_active'], true);

      this.setValue(
        userValues,
        userColumns,
        [
          'emailVerified',
          'email_verified',
          'isEmailVerified',
          'is_email_verified',
        ],
        false,
      );

      this.setValue(
        userValues,
        userColumns,
        ['mustChangePassword', 'must_change_password'],
        true,
      );

      this.setTimestamps(userValues, userColumns);

      const user = await this.insertRow(
        manager,
        usersTable,
        userColumns,
        userValues,
      );

      const userId = String(
        user.id ??
          userValues.get(
            this.requireColumn(
              userColumns,
              ['id'],
              'عمود معرف المستخدم غير موجود',
            ).column_name,
          ) ??
          '',
      );

      if (!userId) {
        throw new InternalServerErrorException('لم يتم إنشاء معرف المستخدم');
      }

      const membershipTable = await this.requireTable(
        manager,
        ['academy_memberships', 'academyMemberships'],
        'جدول عضويات الأكاديميات غير موجود',
      );

      const membershipColumns = await this.getColumns(manager, membershipTable);

      const roleColumn = this.requireColumn(
        membershipColumns,
        ['role'],
        'عمود دور العضوية غير موجود',
      );

      const membershipValues = new Map<string, unknown>();

      this.setValue(membershipValues, membershipColumns, ['id'], randomUUID());

      this.setValue(
        membershipValues,
        membershipColumns,
        ['userId', 'user_id'],
        userId,
      );

      this.setValue(
        membershipValues,
        membershipColumns,
        ['academyId', 'academy_id'],
        academyId,
      );

      this.setValue(
        membershipValues,
        membershipColumns,
        ['branchId', 'branch_id'],
        branchId,
      );

      membershipValues.set(
        roleColumn.column_name,
        await this.enumValue(manager, roleColumn, 'ACADEMY_ADMIN', [
          'ACADEMY_ADMIN',
          'ADMIN',
          'OWNER',
          'MANAGER',
        ]),
      );

      this.setValue(
        membershipValues,
        membershipColumns,
        ['isPrimary', 'is_primary'],
        true,
      );

      this.setValue(
        membershipValues,
        membershipColumns,
        ['isActive', 'is_active'],
        true,
      );

      this.setTimestamps(membershipValues, membershipColumns);

      const membership = await this.insertRow(
        manager,
        membershipTable,
        membershipColumns,
        membershipValues,
      );

      return {
        user,
        membership,
        branchId,
      };
    });
  }

  private async getAcademy(
    executor: SqlExecutor,
    academyId: string,
  ): Promise<DatabaseRow> {
    const table = await this.requireTable(
      executor,
      ['academies', 'academy'],
      'جدول الأكاديميات غير موجود',
    );

    const columns = await this.getColumns(executor, table);

    const idColumn = this.requireColumn(
      columns,
      ['id'],
      'عمود معرف الأكاديمية غير موجود',
    );

    const rows = await executor.query(
      `
          SELECT *
          FROM ${this.quote(table)}
          WHERE ${this.quote(idColumn.column_name)} = $1
          LIMIT 1
        `,
      [academyId],
    );

    if (!rows[0]) {
      throw new NotFoundException('الأكاديمية غير موجودة');
    }

    return rows[0];
  }

  private async findBranches(
    executor: SqlExecutor,
    academyId: string,
  ): Promise<DatabaseRow[]> {
    const table = await this.resolveTable(executor, ['branches', 'branch']);

    if (!table) {
      return [];
    }

    const columns = await this.getColumns(executor, table);

    const academyColumn = this.findColumn(columns, ['academyId', 'academy_id']);

    if (!academyColumn) {
      return [];
    }

    return executor.query(
      `
        SELECT *
        FROM ${this.quote(table)}
        WHERE ${this.quote(academyColumn.column_name)} = $1
      `,
      [academyId],
    );
  }

  private async findManagers(
    executor: SqlExecutor,
    academyId: string,
  ): Promise<DatabaseRow[]> {
    const membershipTable = await this.resolveTable(executor, [
      'academy_memberships',
      'academyMemberships',
    ]);

    const usersTable = await this.resolveTable(executor, ['users', 'user']);

    if (!membershipTable || !usersTable) {
      return [];
    }

    const membershipColumns = await this.getColumns(executor, membershipTable);

    const userColumns = await this.getColumns(executor, usersTable);

    const membershipUserColumn = this.findColumn(membershipColumns, [
      'userId',
      'user_id',
    ]);

    const membershipAcademyColumn = this.findColumn(membershipColumns, [
      'academyId',
      'academy_id',
    ]);

    const userIdColumn = this.findColumn(userColumns, ['id']);

    if (!membershipUserColumn || !membershipAcademyColumn || !userIdColumn) {
      return [];
    }

    const userSelect = (candidates: readonly string[], alias: string) => {
      const column = this.findColumn(userColumns, candidates);

      return column
        ? `u.${this.quote(column.column_name)} AS ${this.quote(alias)}`
        : `NULL AS ${this.quote(alias)}`;
    };

    const roleColumn = this.findColumn(membershipColumns, ['role']);

    const branchColumn = this.findColumn(membershipColumns, [
      'branchId',
      'branch_id',
    ]);

    return executor.query(
      `
        SELECT
          ${userSelect(['id'], 'id')},
          ${userSelect(['firstName', 'first_name'], 'firstName')},
          ${userSelect(['lastName', 'last_name'], 'lastName')},
          ${userSelect(['email'], 'email')},
          ${userSelect(['phone'], 'phone')},
          ${
            roleColumn
              ? `m.${this.quote(roleColumn.column_name)}::text AS "role"`
              : 'NULL AS "role"'
          },
          ${
            branchColumn
              ? `m.${this.quote(branchColumn.column_name)} AS "branchId"`
              : 'NULL AS "branchId"'
          }
        FROM ${this.quote(membershipTable)} m
        INNER JOIN ${this.quote(usersTable)} u
          ON u.${this.quote(userIdColumn.column_name)}
          =
          m.${this.quote(membershipUserColumn.column_name)}
        WHERE
          m.${this.quote(membershipAcademyColumn.column_name)} = $1
      `,
      [academyId],
    );
  }

  private async ensureBranch(
    executor: SqlExecutor,
    academyId: string,
    academyName: string,
    dto: CreateMainBranchDto,
  ): Promise<DatabaseRow> {
    const table = await this.requireTable(
      executor,
      ['branches', 'branch'],
      'جدول الفروع غير موجود',
    );

    const columns = await this.getColumns(executor, table);

    const academyColumn = this.requireColumn(
      columns,
      ['academyId', 'academy_id'],
      'عمود الأكاديمية داخل الفروع غير موجود',
    );

    const existing = await executor.query(
      `
          SELECT *
          FROM ${this.quote(table)}
          WHERE ${this.quote(academyColumn.column_name)} = $1
          LIMIT 1
        `,
      [academyId],
    );

    if (existing[0]) {
      return existing[0];
    }

    const values = new Map<string, unknown>();

    this.setValue(values, columns, ['id'], randomUUID());

    this.setValue(values, columns, ['academyId', 'academy_id'], academyId);

    this.setValue(
      values,
      columns,
      ['name'],
      dto.name ?? `${academyName} - الفرع الرئيسي`,
    );

    const branchCode = `main-${academyId.replace(/-/g, '').slice(0, 12)}`;

    this.setValue(values, columns, ['code'], branchCode);

    this.setValue(values, columns, ['slug'], branchCode);

    this.setValue(values, columns, ['phone'], dto.phone ?? null);

    this.setValue(values, columns, ['city'], dto.city ?? 'القاهرة');

    this.setValue(
      values,
      columns,
      ['address', 'addressLine', 'address_line'],
      dto.address ?? null,
    );

    this.setValue(
      values,
      columns,
      ['isMain', 'is_main', 'isPrimary', 'is_primary'],
      true,
    );

    this.setValue(values, columns, ['isActive', 'is_active'], true);

    const statusColumn = this.findColumn(columns, ['status']);

    if (statusColumn) {
      values.set(
        statusColumn.column_name,
        await this.enumValue(executor, statusColumn, 'ACTIVE', [
          'ACTIVE',
          'ENABLED',
        ]),
      );
    }

    this.setTimestamps(values, columns);

    return this.insertRow(executor, table, columns, values);
  }

  private async setStatusValues(
    executor: SqlExecutor,
    values: Map<string, unknown>,
    columns: ColumnInfo[],
    status: string,
  ) {
    const statusColumn = this.findColumn(columns, ['status']);

    if (statusColumn) {
      values.set(
        statusColumn.column_name,
        await this.enumValue(executor, statusColumn, status, [
          'ACTIVE',
          'TRIAL',
          'SUSPENDED',
        ]),
      );
    }

    this.setValue(
      values,
      columns,
      ['isActive', 'is_active'],
      status !== 'SUSPENDED',
    );
  }

  private async assertUnique(
    executor: SqlExecutor,
    table: string,
    columns: ColumnInfo[],
    field: string,
    value: string,
    excludedId: string,
    message: string,
  ) {
    const fieldColumn = this.findColumn(columns, [field]);

    const idColumn = this.findColumn(columns, ['id']);

    if (!fieldColumn || !idColumn) {
      return;
    }

    const rows = await executor.query(
      `
          SELECT 1
          FROM ${this.quote(table)}
          WHERE LOWER(
            ${this.quote(fieldColumn.column_name)}::text
          ) = LOWER($1)
          AND ${this.quote(idColumn.column_name)} <> $2
          LIMIT 1
        `,
      [value, excludedId],
    );

    if (rows.length > 0) {
      throw new ConflictException(message);
    }
  }

  private async insertRow(
    executor: SqlExecutor,
    table: string,
    columns: ColumnInfo[],
    values: Map<string, unknown>,
  ): Promise<DatabaseRow> {
    const missing = columns.filter(
      (column) =>
        column.is_nullable === 'NO' &&
        column.column_default === null &&
        !values.has(column.column_name),
    );

    if (missing.length > 0) {
      throw new BadRequestException(
        `أعمدة مطلوبة داخل ${table}: ` +
          missing.map((column) => column.column_name).join(', '),
      );
    }

    const entries = [...values.entries()];

    const rows = await executor.query(
      `
          INSERT INTO ${this.quote(table)}
          (
            ${entries.map(([column]) => this.quote(column)).join(', ')}
          )
          VALUES
          (
            ${entries.map((_, index) => `$${index + 1}`).join(', ')}
          )
          RETURNING *
        `,
      entries.map(([, value]) => value),
    );

    return rows[0];
  }

  private async updateRow(
    executor: SqlExecutor,
    table: string,
    idColumn: string,
    id: string,
    values: Map<string, unknown>,
  ): Promise<DatabaseRow> {
    const entries = [...values.entries()];

    if (entries.length === 0) {
      throw new BadRequestException('لا توجد بيانات للتعديل');
    }

    const rows = await executor.query(
      `
          UPDATE ${this.quote(table)}
          SET
            ${entries
              .map(([column], index) => `${this.quote(column)} = $${index + 1}`)
              .join(', ')}
          WHERE ${this.quote(idColumn)} = $${entries.length + 1}
          RETURNING *
        `,
      [...entries.map(([, value]) => value), id],
    );

    if (!rows[0]) {
      throw new NotFoundException('السجل غير موجود');
    }

    return rows[0];
  }

  private setValue(
    values: Map<string, unknown>,
    columns: ColumnInfo[],
    candidates: readonly string[],
    value: unknown,
  ) {
    const column = this.findColumn(columns, candidates);

    if (column) {
      values.set(column.column_name, value);
    }
  }

  private setTimestamps(values: Map<string, unknown>, columns: ColumnInfo[]) {
    this.setValue(values, columns, ['createdAt', 'created_at'], new Date());

    this.setUpdatedAt(values, columns);

    this.setValue(values, columns, ['deletedAt', 'deleted_at'], null);
  }

  private setUpdatedAt(values: Map<string, unknown>, columns: ColumnInfo[]) {
    this.setValue(values, columns, ['updatedAt', 'updated_at'], new Date());
  }

  private async enumValue(
    executor: SqlExecutor,
    column: ColumnInfo,
    requested: string,
    fallbacks: readonly string[],
  ): Promise<string> {
    if (column.data_type !== 'USER-DEFINED') {
      return requested;
    }

    const rows = await executor.query(
      `
          SELECT enumlabel
          FROM pg_enum
          INNER JOIN pg_type
            ON pg_type.oid =
              pg_enum.enumtypid
          WHERE pg_type.typname = $1
          ORDER BY
            pg_enum.enumsortorder
        `,
      [column.udt_name],
    );

    const values = rows.map((row: { enumlabel: string }) => row.enumlabel);

    if (values.includes(requested)) {
      return requested;
    }

    for (const fallback of fallbacks) {
      if (values.includes(fallback)) {
        return fallback;
      }
    }

    throw new BadRequestException(
      `القيمة غير مدعومة داخل ${column.udt_name}: ${values.join(', ')}`,
    );
  }

  private async requireTable(
    executor: SqlExecutor,
    candidates: readonly string[],
    message: string,
  ): Promise<string> {
    const table = await this.resolveTable(executor, candidates);

    if (!table) {
      throw new InternalServerErrorException(message);
    }

    return table;
  }

  private async resolveTable(
    executor: SqlExecutor,
    candidates: readonly string[],
  ): Promise<string | null> {
    const rows = await executor.query(
      `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema =
            current_schema()
            AND table_type =
              'BASE TABLE'
        `,
    );

    const map = new Map<string, string>(
      rows.map((row: { table_name: string }): [string, string] => [
        row.table_name.toLowerCase(),
        row.table_name,
      ]),
    );

    for (const candidate of candidates) {
      const table = map.get(candidate.toLowerCase());

      if (table) {
        return table;
      }
    }

    return null;
  }

  private async getColumns(
    executor: SqlExecutor,
    table: string,
  ): Promise<ColumnInfo[]> {
    return executor.query(
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
    );
  }

  private requireColumn(
    columns: ColumnInfo[],
    candidates: readonly string[],
    message: string,
  ): ColumnInfo {
    const column = this.findColumn(columns, candidates);

    if (!column) {
      throw new InternalServerErrorException(message);
    }

    return column;
  }

  private findColumn(
    columns: ColumnInfo[],
    candidates: readonly string[],
  ): ColumnInfo | null {
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

  private slugify(value: string): string {
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
