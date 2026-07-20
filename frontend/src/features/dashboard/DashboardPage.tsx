import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  CSSProperties,
} from 'react';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  getDashboardApiError,
  getDashboardContext,
  getDashboardOverview,
} from '../../lib/dashboard-api';

import type {
  AcademyRole,
} from '../../types/users';

import './DashboardPage.css';

interface DashboardPageProps {
  onLogout: () => void;
}

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  roles?: AcademyRole[];
}

interface DashboardCard {
  title: string;
  value: string;
  detail: string;
  icon: string;
  route: string;
  tone:
    | 'blue'
    | 'green'
    | 'purple'
    | 'orange'
    | 'red'
    | 'cyan';
}

const ROLE_LABELS:
Record<AcademyRole, string> = {
  SUPER_ADMIN: 'سوبر أدمن',
  ACADEMY_ADMIN: 'مدير الأكاديمية',
  BRANCH_MANAGER: 'مدير الفرع',
  RECEPTIONIST: 'موظف استقبال',
  ACCOUNTANT: 'محاسب',
  COACH: 'مدرب',
  PARENT: 'ولي أمر',
  TRAINEE: 'متدرب',
};

const NAVIGATION_ITEMS:
NavigationItem[] = [
  {
    label: 'لوحة التحكم',
    icon: '▦',
    route: '',
  },
  {
    label: 'المتدربون',
    icon: '👥',
    route: 'trainees',
  },
  {
    label: 'المجموعات',
    icon: '⚽',
    route: 'groups',
  },
  {
    label: 'الحضور والغياب',
    icon: '✓',
    route: 'attendance',
  },
  {
    label: 'الاشتراكات',
    icon: '💳',
    route: 'billing',
    roles: [
      'SUPER_ADMIN',
      'ACADEMY_ADMIN',
      'BRANCH_MANAGER',
      'RECEPTIONIST',
      'ACCOUNTANT',
    ],
  },
  {
    label: 'التقارير',
    icon: '📊',
    route: 'reports',
    roles: [
      'SUPER_ADMIN',
      'ACADEMY_ADMIN',
      'BRANCH_MANAGER',
      'RECEPTIONIST',
      'ACCOUNTANT',
      'COACH',
    ],
  },
  {
    label: 'بوابة العملاء',
    icon: '👨‍👩‍👦',
    route: 'portal-links',
    roles: [
      'SUPER_ADMIN',
      'ACADEMY_ADMIN',
      'BRANCH_MANAGER',
    ],
  },
  {
    label: 'المستخدمون',
    icon: '👤',
    route: 'users',
  },
  {
    label: 'الإعدادات',
    icon: '⚙',
    route: 'settings',
    roles: [
      'SUPER_ADMIN',
      'ACADEMY_ADMIN',
      'BRANCH_MANAGER',
    ],
  },
];

function today(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function monthStart(): string {
  const current = new Date();

  return new Date(
    Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      1,
    ),
  )
    .toISOString()
    .slice(0, 10);
}

function formatDate(
  value: string,
): string {
  const date = new Date(
    `${value}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'ar-EG',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  ).format(date);
}

function formatDateTime(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'ar-EG',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date);
}

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    'ar-EG',
  ).format(Number(value) || 0);
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
    ).format(Number(value) || 0);
  } catch {
    return `${formatNumber(value)} ${currency}`;
  }
}

function navigate(
  route: string,
): void {
  window.location.hash = route;
}

export function DashboardPage({
  onLogout,
}: DashboardPageProps) {
  const [academyId, setAcademyId] =
    useState('');

  const [branchId, setBranchId] =
    useState('');

  const [dateFrom, setDateFrom] =
    useState(monthStart);

  const [dateTo, setDateTo] =
    useState(today);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const contextQuery = useQuery({
    queryKey: ['dashboard-context'],
    queryFn: getDashboardContext,
    staleTime: 60_000,
  });

  const context = contextQuery.data;

  const currentRole =
    context?.currentRole;

  const isSuperAdmin =
    currentRole === 'SUPER_ADMIN';

  useEffect(() => {
    if (!context || academyId) {
      return;
    }

    const resolvedAcademyId =
      context.currentMembership
        ?.academyId ??
      context.academies.find(
        (academy) =>
          academy.isActive !== false,
      )?.id ??
      '';

    setAcademyId(
      resolvedAcademyId,
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

  const availableBranches =
    useMemo(
      () =>
        (context?.branches ?? []).filter(
          (branch) =>
            branch.academyId ===
              academyId &&
            branch.isActive !== false,
        ),
      [
        academyId,
        context?.branches,
      ],
    );

  useEffect(() => {
    if (!branchId) {
      return;
    }

    const branchExists =
      availableBranches.some(
        (branch) =>
          branch.id === branchId,
      );

    if (!branchExists) {
      setBranchId('');
    }
  }, [
    availableBranches,
    branchId,
  ]);

  const selectedAcademy =
    context?.academies.find(
      (academy) =>
        academy.id === academyId,
    );

  const overviewQuery = useQuery({
    queryKey: [
      'dashboard-overview',
      academyId,
      branchId,
      dateFrom,
      dateTo,
    ],

    queryFn: () =>
      getDashboardOverview({
        academyId,
        branchId:
          branchId || undefined,
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

  const dashboard =
    overviewQuery.data;

  const currency =
    selectedAcademy?.currency ??
    'EGP';

  const visibleNavigation =
    NAVIGATION_ITEMS.filter(
      (item) =>
        !item.roles ||
        !currentRole ||
        item.roles.includes(
          currentRole,
        ),
    );

  const cards =
    useMemo<DashboardCard[]>(() => {
      if (!dashboard) {
        return [];
      }

      return [
        {
          title: 'إجمالي المتدربين',
          value: formatNumber(
            dashboard.metrics.trainees
              .total,
          ),
          detail: `${formatNumber(
            dashboard.metrics.trainees
              .newInPeriod,
          )} متدرب جديد خلال الفترة`,
          icon: '👥',
          route: 'trainees',
          tone: 'blue',
        },
        {
          title: 'المجموعات النشطة',
          value: formatNumber(
            dashboard.metrics.training
              .activeGroups,
          ),
          detail: `${formatNumber(
            dashboard.metrics.training
              .sessionsInPeriod,
          )} حصة تدريبية خلال الفترة`,
          icon: '⚽',
          route: 'groups',
          tone: 'green',
        },
        {
          title: 'الاشتراكات النشطة',
          value: formatNumber(
            dashboard.metrics
              .subscriptions.active,
          ),
          detail: `${formatNumber(
            dashboard.metrics
              .subscriptions.pending,
          )} اشتراك قيد الانتظار`,
          icon: '✅',
          route: 'billing',
          tone: 'purple',
        },
        {
          title: 'إيرادات الفترة',
          value: formatMoney(
            dashboard.metrics.revenue
              .amount,
            currency,
          ),
          detail: `${formatNumber(
            dashboard.metrics.revenue
              .paymentsCount,
          )} عملية دفع`,
          icon: '💰',
          route: 'billing',
          tone: 'orange',
        },
        {
          title: 'المبالغ المستحقة',
          value: formatMoney(
            dashboard.metrics
              .subscriptions
              .outstandingBalance,
            currency,
          ),
          detail: `${formatNumber(
            dashboard.metrics
              .subscriptions
              .outstandingCount,
          )} اشتراك عليه رصيد`,
          icon: '⚠',
          route: 'billing',
          tone: 'red',
        },
        {
          title: 'نسبة الحضور',
          value: `${formatNumber(
            dashboard.metrics.attendance
              .rate,
          )}%`,
          detail: `${formatNumber(
            dashboard.metrics.attendance
              .attended,
          )} حاضر من ${formatNumber(
            dashboard.metrics.attendance
              .marked,
          )}`,
          icon: '📋',
          route: 'attendance',
          tone: 'cyan',
        },
      ];
    }, [
      currency,
      dashboard,
    ]);

  const attendanceStyle =
    useMemo<CSSProperties>(() => {
      const rate = Math.max(
        0,
        Math.min(
          100,
          dashboard?.metrics.attendance
            .rate ?? 0,
        ),
      );

      return {
        '--dashboard-attendance-rate':
          `${rate}%`,
      } as CSSProperties;
    }, [dashboard]);

  function refreshAll(): void {
    void contextQuery.refetch();
    void overviewQuery.refetch();
  }

  function handleLogout(): void {
    setMobileMenuOpen(false);
    onLogout();
  }

  if (contextQuery.isPending) {
    return (
      <main
        className="dashboard-state-page"
        dir="rtl"
      >
        <div className="dashboard-loader" />

        <h1>
          جارٍ تجهيز لوحة التحكم
        </h1>

        <p>
          يتم تحميل بيانات الحساب
          والأكاديمية.
        </p>
      </main>
    );
  }

  if (
    contextQuery.isError ||
    !context
  ) {
    return (
      <main
        className="dashboard-state-page"
        dir="rtl"
      >
        <div className="dashboard-state-icon">
          !
        </div>

        <h1>
          تعذر تحميل بيانات الحساب
        </h1>

        <p>
          {getDashboardApiError(
            contextQuery.error,
          )}
        </p>

        <div className="dashboard-state-actions">
          <button
            type="button"
            onClick={() =>
              void contextQuery.refetch()
            }
          >
            إعادة المحاولة
          </button>

          <button
            type="button"
            className="secondary"
            onClick={handleLogout}
          >
            تسجيل الخروج
          </button>
        </div>
      </main>
    );
  }

  return (
    <div
      className="professional-dashboard"
      dir="rtl"
    >
      <button
        type="button"
        className="dashboard-mobile-toggle"
        onClick={() =>
          setMobileMenuOpen(
            (current) => !current,
          )
        }
        aria-label="فتح القائمة"
      >
        ☰
      </button>

      {mobileMenuOpen && (
        <button
          type="button"
          className="dashboard-mobile-backdrop"
          onClick={() =>
            setMobileMenuOpen(false)
          }
          aria-label="إغلاق القائمة"
        />
      )}

      <aside
        className={
          mobileMenuOpen
            ? 'professional-sidebar open'
            : 'professional-sidebar'
        }
      >
        <header className="dashboard-brand">
          <div className="dashboard-brand-logo">
            H
          </div>

          <div>
            <strong>Haymclub</strong>
            <span>
              إدارة الأكاديمية
            </span>
          </div>
        </header>

        <div className="dashboard-account">
          <div className="dashboard-account-avatar">
            {context.currentUser
              .firstName
              ?.charAt(0)
              .toUpperCase() || 'H'}
          </div>

          <div>
            <strong>
              {context.currentUser
                .fullName ||
                context.currentUser.email}
            </strong>

            <span>
              {currentRole
                ? ROLE_LABELS[
                    currentRole
                  ]
                : 'مستخدم'}
            </span>
          </div>
        </div>

        <nav className="dashboard-navigation">
          <p>القائمة الرئيسية</p>

          {visibleNavigation.map(
            (item) => (
              <button
                type="button"
                key={
                  item.route ||
                  'dashboard'
                }
                className={
                  item.route === ''
                    ? 'active'
                    : ''
                }
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(item.route);
                }}
              >
                <span>
                  {item.icon}
                </span>

                {item.label}
              </button>
            ),
          )}
        </nav>

        <footer className="dashboard-sidebar-footer">
          <button
            type="button"
            onClick={handleLogout}
          >
            <span>↪</span>
            تسجيل الخروج
          </button>

          <small>
            Haymclub Academy System
          </small>
        </footer>
      </aside>

      <main className="professional-dashboard-main">
        <header className="professional-dashboard-header">
          <div>
            <p className="dashboard-welcome">
              أهلاً بك،{' '}
              {context.currentUser
                .firstName}
            </p>

            <h1>لوحة التحكم</h1>

            <p>
              متابعة أداء الأكاديمية
              والاشتراكات والحضور من مكان
              واحد.
            </p>
          </div>

          <div className="dashboard-header-actions">
            <div className="dashboard-generated-time">
              <span>
                آخر تحديث
              </span>

              <strong>
                {dashboard
                  ? formatDateTime(
                      dashboard.generatedAt,
                    )
                  : '—'}
              </strong>
            </div>

            <button
              type="button"
              className="dashboard-refresh-button"
              disabled={
                contextQuery.isFetching ||
                overviewQuery.isFetching
              }
              onClick={refreshAll}
            >
              {overviewQuery.isFetching
                ? 'جارٍ التحديث...'
                : '↻ تحديث البيانات'}
            </button>
          </div>
        </header>

        <section className="dashboard-filters">
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
                  (academy) => (
                    <option
                      key={academy.id}
                      value={academy.id}
                    >
                      {academy.name}
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
              disabled={
                Boolean(
                  context.currentMembership
                    ?.branchId,
                )
              }
              onChange={(event) =>
                setBranchId(
                  event.target.value,
                )
              }
            >
              <option value="">
                كل الفروع
              </option>

              {availableBranches.map(
                (branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name}
                    {branch.isMain
                      ? ' — الرئيسي'
                      : ''}
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
        </section>

        {dateFrom > dateTo && (
          <div className="dashboard-error-message">
            تاريخ البداية لا يمكن أن يكون
            بعد تاريخ النهاية.
          </div>
        )}

        {overviewQuery.isError && (
          <div className="dashboard-error-message">
            <span>
              {getDashboardApiError(
                overviewQuery.error,
              )}
            </span>

            <button
              type="button"
              onClick={() =>
                void overviewQuery.refetch()
              }
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {overviewQuery.isPending ? (
          <section className="dashboard-loading-panel">
            <div className="dashboard-loader" />

            <h2>
              جارٍ تحميل مؤشرات الأكاديمية
            </h2>
          </section>
        ) : dashboard ? (
          <>
            <section className="dashboard-summary-line">
              <div>
                <span>
                  نطاق التقرير
                </span>

                <strong>
                  {formatDate(
                    dashboard.period.dateFrom,
                  )}
                  {' — '}
                  {formatDate(
                    dashboard.period.dateTo,
                  )}
                </strong>
              </div>

              <div>
                <span>الأكاديمية</span>

                <strong>
                  {selectedAcademy?.name ??
                    context
                      .currentMembership
                      ?.academy?.name ??
                    'الأكاديمية الحالية'}
                </strong>
              </div>

              <div>
                <span>الفرع</span>

                <strong>
                  {branchId
                    ? availableBranches.find(
                        (branch) =>
                          branch.id ===
                          branchId,
                      )?.name ?? 'الفرع'
                    : 'كل الفروع'}
                </strong>
              </div>
            </section>

            <section className="dashboard-cards-grid">
              {cards.map((card) => (
                <button
                  type="button"
                  key={card.title}
                  className={`dashboard-stat-card dashboard-stat-${card.tone}`}
                  onClick={() =>
                    navigate(card.route)
                  }
                >
                  <span className="dashboard-card-icon">
                    {card.icon}
                  </span>

                  <div>
                    <p>{card.title}</p>
                    <strong>
                      {card.value}
                    </strong>
                    <small>
                      {card.detail}
                    </small>
                  </div>

                  <span className="dashboard-card-arrow">
                    ←
                  </span>
                </button>
              ))}
            </section>

            <section className="dashboard-panels-grid">
              <article className="dashboard-panel dashboard-finance-panel">
                <header>
                  <div>
                    <p>
                      الأداء المالي
                    </p>

                    <h2>
                      الإيرادات والاشتراكات
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('billing')
                    }
                  >
                    عرض الاشتراكات
                  </button>
                </header>

                <div className="dashboard-finance-highlight">
                  <div>
                    <span>
                      الإيرادات المحصلة
                    </span>

                    <strong>
                      {formatMoney(
                        dashboard.metrics
                          .revenue.amount,
                        currency,
                      )}
                    </strong>

                    <small>
                      من{' '}
                      {formatNumber(
                        dashboard.metrics
                          .revenue
                          .paymentsCount,
                      )}{' '}
                      عملية دفع
                    </small>
                  </div>

                  <div>
                    <span>
                      الأرصدة المستحقة
                    </span>

                    <strong className="danger">
                      {formatMoney(
                        dashboard.metrics
                          .subscriptions
                          .outstandingBalance,
                        currency,
                      )}
                    </strong>

                    <small>
                      على{' '}
                      {formatNumber(
                        dashboard.metrics
                          .subscriptions
                          .outstandingCount,
                      )}{' '}
                      اشتراك
                    </small>
                  </div>
                </div>

                <div className="dashboard-subscription-statuses">
                  <div>
                    <span className="active" />
                    <p>
                      اشتراكات نشطة
                    </p>
                    <strong>
                      {formatNumber(
                        dashboard.metrics
                          .subscriptions
                          .active,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="pending" />
                    <p>
                      قيد الانتظار
                    </p>
                    <strong>
                      {formatNumber(
                        dashboard.metrics
                          .subscriptions
                          .pending,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="expired" />
                    <p>
                      اشتراكات منتهية
                    </p>
                    <strong>
                      {formatNumber(
                        dashboard.metrics
                          .subscriptions
                          .expired,
                      )}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="dashboard-panel dashboard-attendance-panel">
                <header>
                  <div>
                    <p>الحضور</p>
                    <h2>
                      معدل حضور المتدربين
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        'attendance',
                      )
                    }
                  >
                    سجل الحضور
                  </button>
                </header>

                <div
                  className="dashboard-attendance-circle"
                  style={attendanceStyle}
                >
                  <div>
                    <strong>
                      {formatNumber(
                        dashboard.metrics
                          .attendance.rate,
                      )}
                      %
                    </strong>

                    <span>
                      نسبة الحضور
                    </span>
                  </div>
                </div>

                <div className="dashboard-attendance-details">
                  <div>
                    <span>تم تسجيلهم</span>
                    <strong>
                      {formatNumber(
                        dashboard.metrics
                          .attendance.marked,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>حضور</span>
                    <strong className="success">
                      {formatNumber(
                        dashboard.metrics
                          .attendance
                          .attended,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      غياب أو اعتذار
                    </span>
                    <strong className="danger">
                      {formatNumber(
                        dashboard.metrics
                          .attendance
                          .absentOrExcused,
                      )}
                    </strong>
                  </div>
                </div>
              </article>
            </section>

            <section className="dashboard-bottom-grid">
              <article className="dashboard-panel dashboard-alerts-panel">
                <header>
                  <div>
                    <p>التنبيهات</p>
                    <h2>
                      تنبيهات تحتاج إلى
                      متابعة
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('billing')
                    }
                  >
                    عرض الكل
                  </button>
                </header>

                <div className="dashboard-alerts-list">
                  <button
                    type="button"
                    onClick={() =>
                      navigate('billing')
                    }
                  >
                    <span className="warning">
                      ⏳
                    </span>

                    <div>
                      <strong>
                        اشتراكات تنتهي خلال
                        7 أيام
                      </strong>
                      <small>
                        تحتاج إلى التواصل
                        للتجديد
                      </small>
                    </div>

                    <b>
                      {formatNumber(
                        dashboard.alerts
                          .expiringNext7Days,
                      )}
                    </b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('billing')
                    }
                  >
                    <span className="danger">
                      !
                    </span>

                    <div>
                      <strong>
                        اشتراكات منتهية
                      </strong>
                      <small>
                        انتهت ولم يتم
                        تجديدها
                      </small>
                    </div>

                    <b>
                      {formatNumber(
                        dashboard.alerts
                          .expired,
                      )}
                    </b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('billing')
                    }
                  >
                    <span className="info">
                      💳
                    </span>

                    <div>
                      <strong>
                        اشتراكات عليها
                        مستحقات
                      </strong>
                      <small>
                        يوجد رصيد مالي
                        متبقٍ
                      </small>
                    </div>

                    <b>
                      {formatNumber(
                        dashboard.alerts
                          .outstanding,
                      )}
                    </b>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('billing')
                    }
                  >
                    <span className="danger">
                      ⚠
                    </span>

                    <div>
                      <strong>
                        مديونيات متأخرة
                      </strong>
                      <small>
                        اشتراكات منتهية
                        عليها رصيد
                      </small>
                    </div>

                    <b>
                      {formatNumber(
                        dashboard.alerts
                          .overdueBalances,
                      )}
                    </b>
                  </button>
                </div>
              </article>

              <article className="dashboard-panel dashboard-quick-actions">
                <header>
                  <div>
                    <p>
                      وصول سريع
                    </p>

                    <h2>
                      العمليات اليومية
                    </h2>
                  </div>
                </header>

                <div>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('trainees')
                    }
                  >
                    <span>＋</span>
                    إضافة متدرب
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('billing')
                    }
                  >
                    <span>💳</span>
                    إنشاء اشتراك
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        'attendance',
                      )
                    }
                  >
                    <span>✓</span>
                    تسجيل الحضور
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('groups')
                    }
                  >
                    <span>⚽</span>
                    إدارة المجموعات
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('users')
                    }
                  >
                    <span>👤</span>
                    إضافة مستخدم
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('settings')
                    }
                  >
                    <span>⚙</span>
                    إعدادات الأكاديمية
                  </button>
                </div>
              </article>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
