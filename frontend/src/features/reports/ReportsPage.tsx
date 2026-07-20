import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  getReportsApiError,
  getReportsContext,
  getReportsSnapshot,
} from '../../lib/reports-api';

import type {
  ReportCellValue,
  ReportRow,
  ReportsTab,
} from '../../types/reports';

import './ReportsPage.css';

interface ReportsPageProps {
  onBack: () => void;
}

interface ReportTabDefinition {
  id: ReportsTab;
  label: string;
  icon: string;
}

const REPORT_TABS:
ReportTabDefinition[] = [
  {
    id: 'summary',
    label: 'الملخص العام',
    icon: '▦',
  },
  {
    id: 'trainees',
    label: 'المتدربون',
    icon: '👥',
  },
  {
    id: 'subscriptions',
    label: 'الاشتراكات',
    icon: '💳',
  },
  {
    id: 'attendance',
    label: 'الحضور',
    icon: '✓',
  },
  {
    id: 'groups',
    label: 'المجموعات',
    icon: '⚽',
  },
];

const MONEY_COLUMNS = new Set([
  'الإجمالي',
  'المدفوع',
  'الرصيد',
]);

function today(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function monthStart(): string {
  const date = new Date();

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1,
    ),
  )
    .toISOString()
    .slice(0, 10);
}

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    'ar-EG',
  ).format(value);
}

function formatMoney(
  value: number,
  currency: string,
): string {
  try {
    return new Intl.NumberFormat(
      'ar-EG',
      {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      },
    ).format(value);
  } catch {
    return `${formatNumber(
      value,
    )} ${currency}`;
  }
}

function formatDate(
  value: string,
): string {
  if (
    !value ||
    value === '—'
  ) {
    return '—';
  }

  const date = new Date(
    `${value.slice(0, 10)}T00:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'ar-EG',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  ).format(date);
}

function translateStatus(
  value: ReportCellValue,
): string {
  const status =
    String(value);

  const labels:
  Record<string, string> = {
    ACTIVE: 'نشط',
    INACTIVE: 'غير نشط',
    SUSPENDED: 'موقوف',
    PENDING: 'قيد الانتظار',
    PAUSED: 'متوقف مؤقتًا',
    EXPIRED: 'منتهي',
    CANCELLED: 'ملغي',
    COMPLETED: 'مكتمل',
    SCHEDULED: 'مجدولة',
    IN_PROGRESS: 'قيد التنفيذ',
    PRESENT: 'حاضر',
    ABSENT: 'غائب',
    LATE: 'متأخر',
    EXCUSED: 'معتذر',
    NOT_MARKED: 'غير مسجل',
  };

  return labels[status] ??
    status;
}

function escapeCsvCell(
  value: ReportCellValue,
): string {
  const text =
    String(value ?? '');

  return `"${text.replace(
    /"/g,
    '""',
  )}"`;
}

function downloadCsv(
  filename: string,
  columns: string[],
  rows: ReportRow[],
): void {
  const csvLines = [
    columns
      .map(escapeCsvCell)
      .join(','),

    ...rows.map((row) =>
      columns
        .map((column) =>
          escapeCsvCell(
            row.values[column] ??
              '',
          ),
        )
        .join(','),
    ),
  ];

  const blob = new Blob(
    [
      '\uFEFF',
      csvLines.join('\r\n'),
    ],
    {
      type:
        'text/csv;charset=utf-8;',
    },
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export function ReportsPage({
  onBack,
}: ReportsPageProps) {
  const [tab, setTab] =
    useState<ReportsTab>(
      'summary',
    );

  const [
    academyId,
    setAcademyId,
  ] = useState('');

  const [
    branchId,
    setBranchId,
  ] = useState('');

  const [
    dateFrom,
    setDateFrom,
  ] = useState(monthStart);

  const [dateTo, setDateTo] =
    useState(today);

  const [search, setSearch] =
    useState('');

  const contextQuery = useQuery({
    queryKey: [
      'reports-context',
    ],

    queryFn:
      getReportsContext,

    staleTime: 60_000,
  });

  const context =
    contextQuery.data;

  const isSuperAdmin =
    context?.currentRole ===
    'SUPER_ADMIN';

  useEffect(() => {
    if (
      !context ||
      academyId
    ) {
      return;
    }

    setAcademyId(
      context.currentMembership
        ?.academyId ??
        context.academies[0]?.id ??
        '',
    );

    setBranchId(
      context.currentMembership
        ?.branchId ??
        '',
    );
  }, [
    academyId,
    context,
  ]);

  const branches = useMemo(
    () =>
      (context?.branches ?? [])
        .filter(
          (branch) =>
            branch.academyId ===
              academyId &&
            branch.isActive !==
              false,
        ),

    [
      academyId,
      context?.branches,
    ],
  );

  useEffect(() => {
    if (
      !branchId ||
      branches.some(
        (branch) =>
          branch.id === branchId,
      )
    ) {
      return;
    }

    setBranchId('');
  }, [
    branchId,
    branches,
  ]);

  const reportsQuery = useQuery({
    queryKey: [
      'reports-snapshot',
      academyId,
      branchId,
      dateFrom,
      dateTo,
    ],

    queryFn: () =>
      getReportsSnapshot({
        academyId,
        branchId:
          branchId ||
          undefined,
        dateFrom,
        dateTo,
      }),

    enabled:
      Boolean(academyId) &&
      Boolean(dateFrom) &&
      Boolean(dateTo) &&
      dateFrom <= dateTo,

    staleTime: 30_000,
  });

  const snapshot =
    reportsQuery.data;

  const academy =
    context?.academies.find(
      (item) =>
        item.id === academyId,
    );

  const currency =
    academy?.currency ??
    'EGP';

  const allRows =
    useMemo<ReportRow[]>(() => {
      if (
        !snapshot ||
        tab === 'summary'
      ) {
        return [];
      }

      return snapshot[tab];
    }, [
      snapshot,
      tab,
    ]);

  const visibleRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return allRows;
      }

      return allRows.filter(
        (row) =>
          row.searchText.includes(
            query,
          ),
      );
    }, [
      allRows,
      search,
    ]);

  const columns =
    useMemo<string[]>(() => {
      const firstRow =
        visibleRows[0] ??
        allRows[0];

      return firstRow
        ? Object.keys(
            firstRow.values,
          )
        : [];
    }, [
      allRows,
      visibleRows,
    ]);

  const counts = {
    trainees:
      snapshot?.trainees.length ??
      0,

    subscriptions:
      snapshot?.subscriptions
        .length ?? 0,

    attendance:
      snapshot?.attendance.length ??
      0,

    groups:
      snapshot?.groups.length ??
      0,
  };

  function exportCurrentReport():
  void {
    if (
      tab === 'summary' ||
      columns.length === 0
    ) {
      return;
    }

    downloadCsv(
      `haymclub-${tab}-${dateFrom}-${dateTo}.csv`,
      columns,
      visibleRows,
    );
  }

  function refreshReports(): void {
    void contextQuery.refetch();
    void reportsQuery.refetch();
  }

  function renderCell(
    column: string,
    value: ReportCellValue,
  ): string {
    if (
      MONEY_COLUMNS.has(
        column,
      ) &&
      typeof value ===
        'number'
    ) {
      return formatMoney(
        value,
        currency,
      );
    }

    if (
      column.includes('تاريخ')
    ) {
      return formatDate(
        String(value),
      );
    }

    if (
      column === 'الحالة'
    ) {
      return translateStatus(
        value,
      );
    }

    if (
      typeof value ===
      'number'
    ) {
      return formatNumber(
        value,
      );
    }

    return String(value);
  }

  if (
    contextQuery.isPending
  ) {
    return (
      <main
        className="reports-state"
        dir="rtl"
      >
        <div className="reports-loader" />
        <h1>
          جارٍ تحميل التقارير
        </h1>
      </main>
    );
  }

  if (
    contextQuery.isError ||
    !context
  ) {
    return (
      <main
        className="reports-state"
        dir="rtl"
      >
        <h1>
          تعذر تحميل التقارير
        </h1>

        <p>
          {getReportsApiError(
            contextQuery.error,
          )}
        </p>

        <button
          type="button"
          onClick={() =>
            void contextQuery.refetch()
          }
        >
          إعادة المحاولة
        </button>
      </main>
    );
  }

  return (
    <main
      className="reports-page"
      dir="rtl"
    >
      <header className="reports-header">
        <div>
          <button
            type="button"
            className="reports-back"
            onClick={onBack}
          >
            ← الرجوع إلى لوحة التحكم
          </button>

          <p className="reports-eyebrow">
            التقارير والتحليلات
          </p>

          <h1>
            تقارير الأكاديمية
          </h1>

          <p>
            تقارير المتدربين
            والاشتراكات والحضور
            والمجموعات والإيرادات.
          </p>
        </div>

        <div className="reports-header-actions">
          <button
            type="button"
            className="reports-secondary-button"
            onClick={() =>
              window.print()
            }
          >
            🖨 طباعة
          </button>

          <button
            type="button"
            className="reports-primary-button"
            disabled={
              tab === 'summary' ||
              visibleRows.length === 0
            }
            onClick={
              exportCurrentReport
            }
          >
            ⇩ تصدير Excel / CSV
          </button>
        </div>
      </header>

      <section className="reports-context">
        <div>
          <span>الأكاديمية</span>
          <strong>
            {academy?.name ??
              'الأكاديمية الحالية'}
          </strong>
        </div>

        <div>
          <span>الفرع</span>
          <strong>
            {branchId
              ? branches.find(
                  (branch) =>
                    branch.id ===
                    branchId,
                )?.name ??
                'الفرع'
              : 'كل الفروع'}
          </strong>
        </div>

        <div>
          <span>الفترة</span>
          <strong>
            {formatDate(dateFrom)}
            {' — '}
            {formatDate(dateTo)}
          </strong>
        </div>
      </section>

      <section className="reports-filters reports-no-print">
        {isSuperAdmin && (
          <label>
            الأكاديمية

            <select
              value={academyId}
              onChange={(event) => {
                setAcademyId(
                  event.target.value,
                );

                setBranchId('');
              }}
            >
              <option value="">
                اختر الأكاديمية
              </option>

              {context.academies.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ),
              )}
            </select>
          </label>
        )}

        <label>
          الفرع

          <select
            value={branchId}
            disabled={Boolean(
              context
                .currentMembership
                ?.branchId,
            )}
            onChange={(event) =>
              setBranchId(
                event.target.value,
              )
            }
          >
            <option value="">
              كل الفروع
            </option>

            {branches.map(
              (branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          من تاريخ

          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(event) =>
              setDateFrom(
                event.target.value,
              )
            }
          />
        </label>

        <label>
          إلى تاريخ

          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(event) =>
              setDateTo(
                event.target.value,
              )
            }
          />
        </label>

        <button
          type="button"
          onClick={refreshReports}
          disabled={
            reportsQuery.isFetching
          }
        >
          {reportsQuery.isFetching
            ? 'جارٍ التحديث...'
            : '↻ تحديث'}
        </button>
      </section>

      {dateFrom > dateTo && (
        <div className="reports-error">
          تاريخ البداية لا يمكن
          أن يكون بعد تاريخ النهاية.
        </div>
      )}

      {reportsQuery.isError && (
        <div className="reports-error">
          {getReportsApiError(
            reportsQuery.error,
          )}
        </div>
      )}

      <nav className="reports-tabs reports-no-print">
        {REPORT_TABS.map(
          (item) => {
            const count =
              item.id ===
              'summary'
                ? null
                : counts[
                    item.id
                  ];

            return (
              <button
                type="button"
                key={item.id}
                className={
                  tab === item.id
                    ? 'active'
                    : ''
                }
                onClick={() => {
                  setTab(item.id);
                  setSearch('');
                }}
              >
                <span>
                  {item.icon}
                </span>

                {item.label}

                {count !== null && (
                  <b>{count}</b>
                )}
              </button>
            );
          },
        )}
      </nav>

      {reportsQuery.isPending ? (
        <section className="reports-loading">
          <div className="reports-loader" />

          <h2>
            جارٍ إعداد التقرير
          </h2>
        </section>
      ) : snapshot ? (
        <>
          {tab === 'summary' ? (
            <>
              <section className="reports-summary-grid">
                <article>
                  <span>
                    إجمالي المتدربين
                  </span>

                  <strong>
                    {formatNumber(
                      snapshot.overview
                        .metrics
                        .trainees.total,
                    )}
                  </strong>

                  <small>
                    {formatNumber(
                      snapshot.overview
                        .metrics
                        .trainees
                        .newInPeriod,
                    )}{' '}
                    تسجيل جديد
                  </small>
                </article>

                <article>
                  <span>
                    إيرادات الفترة
                  </span>

                  <strong>
                    {formatMoney(
                      snapshot.overview
                        .metrics
                        .revenue.amount,
                      currency,
                    )}
                  </strong>

                  <small>
                    {formatNumber(
                      snapshot.overview
                        .metrics
                        .revenue
                        .paymentsCount,
                    )}{' '}
                    عملية دفع
                  </small>
                </article>

                <article>
                  <span>
                    الاشتراكات النشطة
                  </span>

                  <strong>
                    {formatNumber(
                      snapshot.overview
                        .metrics
                        .subscriptions
                        .active,
                    )}
                  </strong>

                  <small>
                    {formatNumber(
                      snapshot.overview
                        .metrics
                        .subscriptions
                        .pending,
                    )}{' '}
                    قيد الانتظار
                  </small>
                </article>

                <article>
                  <span>
                    الرصيد المستحق
                  </span>

                  <strong className="danger">
                    {formatMoney(
                      snapshot.overview
                        .metrics
                        .subscriptions
                        .outstandingBalance,
                      currency,
                    )}
                  </strong>

                  <small>
                    {formatNumber(
                      snapshot.overview
                        .metrics
                        .subscriptions
                        .outstandingCount,
                    )}{' '}
                    اشتراك
                  </small>
                </article>

                <article>
                  <span>
                    المجموعات النشطة
                  </span>

                  <strong>
                    {formatNumber(
                      snapshot.overview
                        .metrics
                        .training
                        .activeGroups,
                    )}
                  </strong>

                  <small>
                    {formatNumber(
                      snapshot.overview
                        .metrics
                        .training
                        .sessionsInPeriod,
                    )}{' '}
                    حصة
                  </small>
                </article>

                <article>
                  <span>
                    نسبة الحضور
                  </span>

                  <strong>
                    {formatNumber(
                      snapshot.overview
                        .metrics
                        .attendance.rate,
                    )}
                    %
                  </strong>

                  <small>
                    {formatNumber(
                      snapshot.overview
                        .metrics
                        .attendance
                        .attended,
                    )}{' '}
                    حضور
                  </small>
                </article>
              </section>

              <section className="reports-summary-panels">
                <article>
                  <header>
                    <h2>
                      حالة الاشتراكات
                    </h2>
                  </header>

                  <div>
                    <p>
                      <span className="green" />
                      نشطة
                    </p>

                    <strong>
                      {formatNumber(
                        snapshot.overview
                          .metrics
                          .subscriptions
                          .active,
                      )}
                    </strong>
                  </div>

                  <div>
                    <p>
                      <span className="orange" />
                      قيد الانتظار
                    </p>

                    <strong>
                      {formatNumber(
                        snapshot.overview
                          .metrics
                          .subscriptions
                          .pending,
                      )}
                    </strong>
                  </div>

                  <div>
                    <p>
                      <span className="red" />
                      منتهية
                    </p>

                    <strong>
                      {formatNumber(
                        snapshot.overview
                          .metrics
                          .subscriptions
                          .expired,
                      )}
                    </strong>
                  </div>
                </article>

                <article>
                  <header>
                    <h2>
                      تنبيهات الاشتراكات
                    </h2>
                  </header>

                  <div>
                    <p>
                      تنتهي خلال 7 أيام
                    </p>

                    <strong>
                      {formatNumber(
                        snapshot.overview
                          .alerts
                          .expiringNext7Days,
                      )}
                    </strong>
                  </div>

                  <div>
                    <p>
                      عليها مستحقات
                    </p>

                    <strong>
                      {formatNumber(
                        snapshot.overview
                          .alerts
                          .outstanding,
                      )}
                    </strong>
                  </div>

                  <div>
                    <p>
                      مديونيات متأخرة
                    </p>

                    <strong>
                      {formatNumber(
                        snapshot.overview
                          .alerts
                          .overdueBalances,
                      )}
                    </strong>
                  </div>
                </article>

                <article>
                  <header>
                    <h2>
                      ملخص الحضور
                    </h2>
                  </header>

                  <div>
                    <p>
                      تم تسجيلهم
                    </p>

                    <strong>
                      {formatNumber(
                        snapshot.overview
                          .metrics
                          .attendance
                          .marked,
                      )}
                    </strong>
                  </div>

                  <div>
                    <p>حضور</p>

                    <strong>
                      {formatNumber(
                        snapshot.overview
                          .metrics
                          .attendance
                          .attended,
                      )}
                    </strong>
                  </div>

                  <div>
                    <p>
                      غياب أو اعتذار
                    </p>

                    <strong>
                      {formatNumber(
                        snapshot.overview
                          .metrics
                          .attendance
                          .absentOrExcused,
                      )}
                    </strong>
                  </div>
                </article>
              </section>
            </>
          ) : (
            <section className="reports-table-section">
              <header>
                <div>
                  <h2>
                    {
                      REPORT_TABS.find(
                        (item) =>
                          item.id ===
                          tab,
                      )?.label
                    }
                  </h2>

                  <p>
                    إجمالي النتائج:{' '}
                    {formatNumber(
                      visibleRows.length,
                    )}
                  </p>
                </div>

                <input
                  className="reports-no-print"
                  type="search"
                  value={search}
                  placeholder="ابحث داخل التقرير"
                  onChange={(event) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                />
              </header>

              {visibleRows.length ===
              0 ? (
                <div className="reports-empty">
                  <div>📊</div>

                  <h3>
                    لا توجد بيانات
                  </h3>

                  <p>
                    لا توجد نتائج مطابقة
                    للفترة والفلاتر
                    المحددة.
                  </p>
                </div>
              ) : (
                <div className="reports-table-wrapper">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>#</th>

                        {columns.map(
                          (column) => (
                            <th
                              key={column}
                            >
                              {column}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {visibleRows.map(
                        (
                          row,
                          rowIndex,
                        ) => (
                          <tr key={row.id}>
                            <td>
                              {formatNumber(
                                rowIndex +
                                  1,
                              )}
                            </td>

                            {columns.map(
                              (column) => (
                                <td
                                  key={
                                    column
                                  }
                                >
                                  {renderCell(
                                    column,
                                    row
                                      .values[
                                      column
                                    ] ?? '',
                                  )}
                                </td>
                              ),
                            )}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      ) : null}

      <footer className="reports-print-footer">
        <strong>
          Haymclub Academy System
        </strong>

        <span>
          تم إنشاء التقرير بتاريخ{' '}
          {new Intl.DateTimeFormat(
            'ar-EG',
            {
              dateStyle: 'full',
              timeStyle: 'short',
            },
          ).format(new Date())}
        </span>
      </footer>
    </main>
  );
}
