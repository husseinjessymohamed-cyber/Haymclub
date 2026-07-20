import axios from 'axios';

import {
  getAttendanceSessions,
} from './attendance-api';

import {
  getSubscriptions,
} from './billing-api';

import {
  getDashboardContext,
  getDashboardOverview,
} from './dashboard-api';

import {
  getTrainingGroups,
} from './groups-api';

import {
  getTrainees,
} from './trainees-api';

import type {
  DashboardContext,
} from '../types/dashboard';

import type {
  ReportCellValue,
  ReportRow,
  ReportsFilters,
  ReportsSnapshot,
} from '../types/reports';

type UnknownRecord =
  Record<string, unknown>;

function toRecord(
  value: unknown,
): UnknownRecord {
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as UnknownRecord;
  }

  return {};
}

function getPath(
  value: unknown,
  path: string,
): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (current, part) =>
        toRecord(current)[part],
      value,
    );
}

function textValue(
  value: unknown,
): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return String(value).trim();
  }

  return '';
}

function firstText(
  ...values: unknown[]
): string {
  for (const value of values) {
    const text = textValue(value);

    if (text) {
      return text;
    }
  }

  return '';
}

function numberValue(
  value: unknown,
): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function personName(
  value: unknown,
): string {
  const record = toRecord(value);

  const combinedName = [
    textValue(record.firstName),
    textValue(record.lastName),
  ]
    .filter(Boolean)
    .join(' ');

  return firstText(
    record.fullName,
    combinedName,
    record.name,
  );
}

function normalizeDate(
  value: unknown,
): string {
  const text = textValue(value);

  return text
    ? text.slice(0, 10)
    : '';
}

function statusFromActive(
  value: unknown,
  fallback: unknown,
): string {
  const fallbackStatus =
    textValue(fallback);

  if (fallbackStatus) {
    return fallbackStatus;
  }

  if (typeof value === 'boolean') {
    return value
      ? 'ACTIVE'
      : 'INACTIVE';
  }

  return '—';
}

function scopeMatches(
  item: unknown,
  academyId: string,
  branchId?: string,
): boolean {
  const itemAcademyId =
    firstText(
      getPath(item, 'academyId'),
      getPath(item, 'academy.id'),
    );

  const itemBranchId =
    firstText(
      getPath(item, 'branchId'),
      getPath(item, 'branch.id'),
    );

  if (
    itemAcademyId &&
    itemAcademyId !== academyId
  ) {
    return false;
  }

  if (
    branchId &&
    itemBranchId &&
    itemBranchId !== branchId
  ) {
    return false;
  }

  return true;
}

function dateWithinPeriod(
  value: unknown,
  dateFrom: string,
  dateTo: string,
): boolean {
  const date = normalizeDate(value);

  if (!date) {
    return true;
  }

  return (
    date >= dateFrom &&
    date <= dateTo
  );
}

function subscriptionOverlapsPeriod(
  item: unknown,
  dateFrom: string,
  dateTo: string,
): boolean {
  const startDate =
    normalizeDate(
      getPath(item, 'startDate'),
    );

  const endDate =
    normalizeDate(
      getPath(item, 'endDate'),
    );

  if (!startDate && !endDate) {
    return true;
  }

  return (
    (!startDate ||
      startDate <= dateTo) &&
    (!endDate ||
      endDate >= dateFrom)
  );
}

function createRow(
  id: string,
  values: Record<
    string,
    ReportCellValue
  >,
): ReportRow {
  return {
    id,
    values,

    searchText:
      Object.values(values)
        .join(' ')
        .toLowerCase(),
  };
}

function normalizeTrainees(
  items: unknown[],
  filters: ReportsFilters,
): ReportRow[] {
  return items
    .filter((item) =>
      scopeMatches(
        item,
        filters.academyId,
        filters.branchId,
      ),
    )
    .filter((item) =>
      dateWithinPeriod(
        getPath(item, 'createdAt'),
        filters.dateFrom,
        filters.dateTo,
      ),
    )
    .map((item, index) => {
      const record =
        toRecord(item);

      const name =
        personName(item);

      const guardian =
        firstText(
          record.guardianName,
          record.parentName,
          personName(record.guardian),
          personName(record.parent),
        );

      return createRow(
        firstText(
          record.id,
          `trainee-${index}`,
        ),
        {
          'رقم المتدرب':
            firstText(
              record.traineeNumber,
              record.registrationNumber,
              record.code,
              '—',
            ),

          'اسم المتدرب':
            name || '—',

          'رقم الهاتف':
            firstText(
              record.phone,
              '—',
            ),

          'ولي الأمر':
            guardian || '—',

          'هاتف ولي الأمر':
            firstText(
              record.guardianPhone,
              record.parentPhone,
              getPath(
                record,
                'guardian.phone',
              ),
              '—',
            ),

          'الفرع':
            firstText(
              getPath(
                record,
                'branch.name',
              ),
              record.branchName,
              '—',
            ),

          'الحالة':
            statusFromActive(
              record.isActive,
              record.status,
            ),

          'تاريخ التسجيل':
            normalizeDate(
              record.createdAt,
            ) || '—',
        },
      );
    });
}

function normalizeSubscriptions(
  items: unknown[],
  filters: ReportsFilters,
): ReportRow[] {
  return items
    .filter((item) =>
      scopeMatches(
        item,
        filters.academyId,
        filters.branchId,
      ),
    )
    .filter((item) =>
      subscriptionOverlapsPeriod(
        item,
        filters.dateFrom,
        filters.dateTo,
      ),
    )
    .map((item, index) => {
      const record =
        toRecord(item);

      return createRow(
        firstText(
          record.id,
          `subscription-${index}`,
        ),
        {
          'رقم الاشتراك':
            firstText(
              record.subscriptionNumber,
              record.code,
              '—',
            ),

          'اسم المتدرب':
            personName(
              record.trainee,
            ) || '—',

          'الخطة':
            firstText(
              getPath(
                record,
                'plan.name',
              ),
              '—',
            ),

          'الفرع':
            firstText(
              getPath(
                record,
                'branch.name',
              ),
              '—',
            ),

          'تاريخ البداية':
            normalizeDate(
              record.startDate,
            ) || '—',

          'تاريخ النهاية':
            normalizeDate(
              record.endDate,
            ) || '—',

          'الحالة':
            firstText(
              record.status,
              '—',
            ),

          'الإجمالي':
            numberValue(
              record.totalAmount,
            ),

          'المدفوع':
            numberValue(
              record.paidAmount,
            ),

          'الرصيد':
            numberValue(
              record.balanceAmount,
            ),
        },
      );
    });
}

function normalizeAttendance(
  items: unknown[],
  filters: ReportsFilters,
): ReportRow[] {
  return items
    .filter((item) =>
      scopeMatches(
        item,
        filters.academyId,
        filters.branchId,
      ),
    )
    .filter((item) =>
      dateWithinPeriod(
        firstText(
          getPath(
            item,
            'sessionDate',
          ),
          getPath(item, 'date'),
        ),
        filters.dateFrom,
        filters.dateTo,
      ),
    )
    .map((item, index) => {
      const record =
        toRecord(item);

      const recordsValue =
        record.records;

      const records =
        Array.isArray(recordsValue)
          ? recordsValue
          : [];

      const marked =
        records.filter(
          (attendanceRecord) =>
            firstText(
              getPath(
                attendanceRecord,
                'status',
              ),
            ) !== 'NOT_MARKED',
        );

      const attended =
        marked.filter(
          (attendanceRecord) => {
            const status =
              firstText(
                getPath(
                  attendanceRecord,
                  'status',
                ),
              );

            return (
              status === 'PRESENT' ||
              status === 'LATE'
            );
          },
        );

      return createRow(
        firstText(
          record.id,
          `attendance-${index}`,
        ),
        {
          'تاريخ الحصة':
            normalizeDate(
              firstText(
                record.sessionDate,
                record.date,
              ),
            ) || '—',

          'المجموعة':
            firstText(
              getPath(
                record,
                'group.name',
              ),
              getPath(
                record,
                'trainingGroup.name',
              ),
              record.groupName,
              '—',
            ),

          'الفرع':
            firstText(
              getPath(
                record,
                'branch.name',
              ),
              '—',
            ),

          'وقت البداية':
            firstText(
              record.startTime,
              '—',
            ),

          'الحالة':
            firstText(
              record.status,
              '—',
            ),

          'تم تسجيلهم':
            marked.length,

          'حضور':
            attended.length,

          'غياب أو اعتذار':
            Math.max(
              0,
              marked.length -
                attended.length,
            ),
        },
      );
    });
}

function normalizeGroups(
  items: unknown[],
  filters: ReportsFilters,
): ReportRow[] {
  return items
    .filter((item) =>
      scopeMatches(
        item,
        filters.academyId,
        filters.branchId,
      ),
    )
    .map((item, index) => {
      const record =
        toRecord(item);

      const schedules =
        Array.isArray(record.schedules)
          ? record.schedules
          : [];

      return createRow(
        firstText(
          record.id,
          `group-${index}`,
        ),
        {
          'كود المجموعة':
            firstText(
              record.code,
              '—',
            ),

          'اسم المجموعة':
            firstText(
              record.name,
              '—',
            ),

          'الفرع':
            firstText(
              getPath(
                record,
                'branch.name',
              ),
              '—',
            ),

          'البرنامج':
            firstText(
              getPath(
                record,
                'program.name',
              ),
              '—',
            ),

          'المدرب':
            personName(
              record.coach,
            ) || 'غير محدد',

          'السعة':
            numberValue(
              record.capacity,
            ),

          'الحالة':
            statusFromActive(
              record.isActive,
              record.status,
            ),

          'عدد المواعيد':
            schedules.length,
        },
      );
    });
}

export async function getReportsContext():
Promise<DashboardContext> {
  return getDashboardContext();
}

export async function getReportsSnapshot(
  filters: ReportsFilters,
): Promise<ReportsSnapshot> {
  const [
    overview,
    trainees,
    subscriptions,
    attendance,
    groups,
  ] = await Promise.all([
    getDashboardOverview({
      academyId:
        filters.academyId,

      branchId:
        filters.branchId,

      dateFrom:
        filters.dateFrom,

      dateTo:
        filters.dateTo,
    }),

    getTrainees(),

    getSubscriptions({
      academyId:
        filters.academyId,

      branchId:
        filters.branchId,
    }),

    getAttendanceSessions(),

    getTrainingGroups({
      branchId:
        filters.branchId,
    }),
  ]);

  return {
    overview,

    trainees:
      normalizeTrainees(
        trainees,
        filters,
      ),

    subscriptions:
      normalizeSubscriptions(
        subscriptions,
        filters,
      ),

    attendance:
      normalizeAttendance(
        attendance,
        filters,
      ),

    groups:
      normalizeGroups(
        groups,
        filters,
      ),
  };
}

export function getReportsApiError(
  error: unknown,
): string {
  if (axios.isAxiosError(error)) {
    const data =
      error.response?.data as
        | {
            message?:
              | string
              | string[];

            error?: string;
          }
        | undefined;

    if (
      Array.isArray(
        data?.message,
      )
    ) {
      return data.message.join(
        '، ',
      );
    }

    if (
      typeof data?.message ===
      'string'
    ) {
      return data.message;
    }

    if (
      typeof data?.error ===
      'string'
    ) {
      return data.error;
    }

    if (!error.response) {
      return 'تعذر الاتصال بالخادم';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'حدث خطأ غير متوقع';
}
