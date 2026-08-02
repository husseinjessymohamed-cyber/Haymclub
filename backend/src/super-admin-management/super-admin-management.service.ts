import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';

import { SuperAdminAuditLog } from './entities/super-admin-audit-log.entity';

import { SupportTicket } from './entities/support-ticket.entity';

import { SystemSetting } from './entities/system-setting.entity';

type DatabaseRow = Record<string, unknown>;

interface ColumnRow {
  column_name: string;
}

@Injectable()
export class SuperAdminManagementService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(SupportTicket)
    private readonly ticketsRepository: Repository<SupportTicket>,

    @InjectRepository(SuperAdminAuditLog)
    private readonly auditRepository: Repository<SuperAdminAuditLog>,

    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
  ) {}

  async onModuleInit() {
    const defaultSettings = [
      {
        key: 'platform.name',
        value: 'Haymclub',
        category: 'PLATFORM',
        isPublic: true,
      },
      {
        key: 'platform.supportEmail',
        value: 'support@haymclub.com',
        category: 'PLATFORM',
        isPublic: true,
      },
      {
        key: 'platform.maintenanceMode',
        value: false,
        category: 'SYSTEM',
        isPublic: false,
      },
    ];

    for (const setting of defaultSettings) {
      const existing = await this.settingsRepository.findOne({
        where: {
          key: setting.key,
        },
      });

      if (!existing) {
        await this.settingsRepository.save(
          this.settingsRepository.create({
            ...setting,
            updatedByUserId: null,
          }),
        );
      }
    }
  }

  async findUsers() {
    const userTable = await this.resolveTable(['users', 'user']);

    if (!userTable) {
      return [];
    }

    const columns = await this.getColumns(userTable);

    const idColumn = this.findColumn(columns, ['id']);

    if (!idColumn) {
      return [];
    }

    const select = (candidates: string[], alias: string) => {
      const column = this.findColumn(columns, candidates);

      if (!column) {
        return `NULL AS ` + this.quoteIdentifier(alias);
      }

      return (
        `${this.quoteIdentifier(column)} ` + `AS ${this.quoteIdentifier(alias)}`
      );
    };

    const orderColumn =
      this.findColumn(columns, ['createdAt', 'created_at', 'email', 'id']) ??
      idColumn;

    const rows = (await this.dataSource.query(
      `
          SELECT
            ${select(['id'], 'id')},
            ${select(['firstName', 'first_name'], 'firstName')},
            ${select(['lastName', 'last_name'], 'lastName')},
            ${select(['email'], 'email')},
            ${select(['phone'], 'phone')},
            ${select(['status'], 'status')},
            ${select(['lastLoginAt', 'last_login_at'], 'lastLoginAt')},
            ${select(['createdAt', 'created_at'], 'createdAt')}
          FROM ${this.quoteIdentifier(userTable)}
          ORDER BY
            ${this.quoteIdentifier(orderColumn)}
            DESC
          LIMIT 500
        `,
    )) as DatabaseRow[];

    const memberships = await this.findUserMemberships();

    const membershipByUser = new Map<string, DatabaseRow>();

    for (const membership of memberships) {
      const userId = String(membership.userId ?? '');

      if (!userId || membershipByUser.has(userId)) {
        continue;
      }

      membershipByUser.set(userId, membership);
    }

    return rows.map((row) => {
      const id = String(row.id ?? '');

      const membership = membershipByUser.get(id);

      return {
        ...row,
        role: membership?.role ?? null,
        academyId: membership?.academyId ?? null,
        membershipActive: membership?.isActive ?? null,
      };
    });
  }

  async updateUserStatus(
    userId: string,
    status: string,
    actorUserId: string | null,
  ) {
    const userTable = await this.resolveTable(['users', 'user']);

    if (!userTable) {
      throw new NotFoundException('Users table not found');
    }

    const columns = await this.getColumns(userTable);

    const idColumn = this.findColumn(columns, ['id']);

    const statusColumn = this.findColumn(columns, ['status']);

    if (!idColumn || !statusColumn) {
      throw new NotFoundException('User status columns not found');
    }

    await this.dataSource.query(
      `
        UPDATE ${this.quoteIdentifier(userTable)}
        SET ${this.quoteIdentifier(statusColumn)}
          = $1
        WHERE ${this.quoteIdentifier(idColumn)}
          = $2
      `,
      [status.trim().toUpperCase(), userId],
    );

    await this.writeAudit(
      actorUserId,
      'SYSTEM_USER_STATUS_UPDATED',
      'USER',
      userId,
      {
        status: status.trim().toUpperCase(),
      },
    );

    return {
      id: userId,
      status: status.trim().toUpperCase(),
    };
  }

  findSupportTickets() {
    return this.ticketsRepository.find({
      order: {
        createdAt: 'DESC',
      },

      take: 500,
    });
  }

  async createSupportTicket(
    dto: CreateSupportTicketDto,
    actorUserId: string | null,
  ) {
    const ticket = await this.ticketsRepository.save(
      this.ticketsRepository.create({
        academyId: dto.academyId ?? null,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority ?? 'MEDIUM',
        status: 'OPEN',
        requesterEmail: dto.requesterEmail ?? null,
        assignedToUserId: null,
      }),
    );

    await this.writeAudit(
      actorUserId,
      'SUPPORT_TICKET_CREATED',
      'SUPPORT_TICKET',
      ticket.id,
      {
        subject: ticket.subject,
        priority: ticket.priority,
      },
    );

    return ticket;
  }

  async updateSupportTicket(
    id: string,
    dto: UpdateSupportTicketDto,
    actorUserId: string | null,
  ) {
    const ticket = await this.ticketsRepository.findOne({
      where: {
        id,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    Object.assign(ticket, dto);

    const saved = await this.ticketsRepository.save(ticket);

    await this.writeAudit(
      actorUserId,
      'SUPPORT_TICKET_UPDATED',
      'SUPPORT_TICKET',
      saved.id,
      {
        status: saved.status,
        priority: saved.priority,
      },
    );

    return saved;
  }

  findAuditLogs() {
    return this.auditRepository.find({
      order: {
        createdAt: 'DESC',
      },

      take: 300,
    });
  }

  findSettings() {
    return this.settingsRepository.find({
      order: {
        category: 'ASC',
        key: 'ASC',
      },
    });
  }

  async updateSetting(
    key: string,
    dto: UpdateSystemSettingDto,
    actorUserId: string | null,
  ) {
    let setting = await this.settingsRepository.findOne({
      where: {
        key,
      },
    });

    if (!setting) {
      setting = this.settingsRepository.create({
        key,
        value: dto.value,
        category: dto.category ?? 'GENERAL',
        isPublic: dto.isPublic ?? false,
        updatedByUserId: actorUserId,
      });
    } else {
      setting.value = dto.value;

      if (dto.category) {
        setting.category = dto.category;
      }

      if (typeof dto.isPublic === 'boolean') {
        setting.isPublic = dto.isPublic;
      }

      setting.updatedByUserId = actorUserId;
    }

    const saved = await this.settingsRepository.save(setting);

    await this.writeAudit(
      actorUserId,
      'SYSTEM_SETTING_UPDATED',
      'SYSTEM_SETTING',
      saved.id,
      {
        key: saved.key,
      },
    );

    return saved;
  }

  async getSystemHealth() {
    const startedAt = Date.now();

    await this.dataSource.query('SELECT 1');

    const tables = (await this.dataSource.query(
      `
          SELECT COUNT(*)::int AS total
          FROM information_schema.tables
          WHERE table_schema =
            current_schema()
            AND table_type =
              'BASE TABLE'
        `,
    )) as Array<{
      total: number | string;
    }>;

    return {
      status: 'HEALTHY',
      database: 'CONNECTED',
      tables: Number(tables[0]?.total ?? 0),
      uptimeSeconds: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  }

  private async findUserMemberships() {
    const membershipTable = await this.resolveTable([
      'academy_memberships',
      'academyMemberships',
    ]);

    if (!membershipTable) {
      return [];
    }

    const columns = await this.getColumns(membershipTable);

    const userIdColumn = this.findColumn(columns, ['userId', 'user_id']);

    if (!userIdColumn) {
      return [];
    }

    const roleColumn = this.findColumn(columns, ['role']);

    const academyColumn = this.findColumn(columns, ['academyId', 'academy_id']);

    const activeColumn = this.findColumn(columns, ['isActive', 'is_active']);

    const primaryColumn = this.findColumn(columns, ['isPrimary', 'is_primary']);

    const selectColumn = (column: string | null, alias: string): string => {
      if (!column) {
        return 'NULL AS ' + this.quoteIdentifier(alias);
      }

      return (
        this.quoteIdentifier(column) + ' AS ' + this.quoteIdentifier(alias)
      );
    };

    const orderExpression = primaryColumn
      ? this.quoteIdentifier(primaryColumn) + ' DESC NULLS LAST'
      : this.quoteIdentifier(userIdColumn) + ' ASC';

    return this.dataSource.query(
      `
        SELECT
          ${selectColumn(userIdColumn, 'userId')},
          ${selectColumn(roleColumn, 'role')},
          ${selectColumn(academyColumn, 'academyId')},
          ${selectColumn(activeColumn, 'isActive')},
          ${selectColumn(primaryColumn, 'isPrimary')}
        FROM ${this.quoteIdentifier(membershipTable)}
        ORDER BY ${orderExpression}
      `,
    ) as Promise<DatabaseRow[]>;
  }

  private async writeAudit(
    actorUserId: string | null,
    action: string,
    entityType: string | null,
    entityId: string | null,
    metadata: Record<string, unknown>,
  ) {
    await this.auditRepository.save(
      this.auditRepository.create({
        actorUserId,
        action,
        entityType,
        entityId,
        metadata,
      }),
    );
  }

  private async resolveTable(candidates: string[]): Promise<string | null> {
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

    for (const candidate of candidates) {
      const table = map.get(candidate.toLowerCase());

      if (table) {
        return table;
      }
    }

    return null;
  }

  private async getColumns(table: string): Promise<string[]> {
    const rows = (await this.dataSource.query(
      `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema =
            current_schema()
            AND table_name = $1
        `,
      [table],
    )) as ColumnRow[];

    return rows.map((row) => row.column_name);
  }

  private findColumn(columns: string[], candidates: string[]): string | null {
    const map = new Map(
      columns.map((column) => [column.toLowerCase(), column]),
    );

    for (const candidate of candidates) {
      const column = map.get(candidate.toLowerCase());

      if (column) {
        return column;
      }
    }

    return null;
  }

  private quoteIdentifier(identifier: string): string {
    return '"' + identifier.replace(/"/g, '""') + '"';
  }
}
