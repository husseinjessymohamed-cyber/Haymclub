import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  getClientPortal,
  getPortalApiError,
} from '../../lib/portal-api';

import type {
  ClientPortalTrainee,
} from '../../types/portal';

import {
  ClientTopTenPanel,
} from '../rankings/ClientTopTenPanel';

import {
  ClientGalleryPanel,
} from '../gallery/ClientGalleryPanel';

import {
  ClientNotificationsPanel,
} from '../notifications/ClientNotificationsPanel';






import { ClientFeedbackPanel } from '../workflow/ClientFeedbackPanel';
import './ClientPortalPage.css';

interface ClientPortalPageProps {
  onLogout: () => void;
}

// HAYMCLUB_TRAINEE_DASHBOARD_FINAL_V1
type PortalSection =
  | 'home'
  | 'profile'
  | 'training'
  | 'attendance'
  | 'subscription'
  | 'payments'
  | 'notifications'
  | 'feedback'
  | 'gallery'
  | 'rankings';

const portalSectionTitles:
Record<PortalSection, string> = {
  home: 'الرئيسية',
  profile: 'ملفي الشخصي',
  training: 'المجموعة والمواعيد',
  attendance: 'الحضور',
  subscription: 'الاشتراك',
  payments: 'المدفوعات',
  notifications: 'الإشعارات',
  feedback: 'التواصل مع الأكاديمية',
  gallery: 'المعرض',
  rankings: 'Top 10',
};

type UnknownRecord =
  Record<string, unknown>;

function asRecord(
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

function asArray(
  value: unknown,
): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function getPath(
  value: unknown,
  path: string,
): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (current, part) =>
        asRecord(current)[part],
      value,
    );
}

function textValue(
  value: unknown,
  fallback = '—',
): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    const text =
      String(value).trim();

    return text || fallback;
  }

  return fallback;
}

function numberValue(
  value: unknown,
): number {
  const number =
    Number(value ?? 0);

  return Number.isFinite(number)
    ? number
    : 0;
}

function fullName(
  value: unknown,
): string {
  const record =
    asRecord(value);

  const name = [
    textValue(
      record.firstName,
      '',
    ),
    textValue(
      record.lastName,
      '',
    ),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    textValue(
      record.fullName,
      '',
    ) ||
    name ||
    textValue(
      record.name,
      '—',
    )
  );
}

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    'ar-EG',
  ).format(value);
}

function formatDate(
  value: unknown,
): string {
  const text =
    textValue(value, '');

  if (!text) {
    return '—';
  }

  const date = new Date(
    `${text.slice(0, 10)}T00:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return text;
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

function formatMoney(
  value: number,
): string {
  return new Intl.NumberFormat(
    'ar-EG',
    {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function statusLabel(
  status: unknown,
): string {
  const value =
    textValue(status);

  const labels:
  Record<string, string> = {
    ACTIVE: 'نشط',
    PENDING: 'قيد الانتظار',
    PAUSED: 'متوقف مؤقتًا',
    EXPIRED: 'منتهي',
    CANCELLED: 'ملغي',
    COMPLETED: 'مكتمل',
    WAITLISTED: 'قائمة انتظار',
  };

  return labels[value] ?? value;
}

function enrollmentGroup(
  enrollment: unknown,
): UnknownRecord {
  return asRecord(
    getPath(
      enrollment,
      'group',
    ),
  );
}

function subscriptionList(
  item: ClientPortalTrainee,
): unknown[] {
  const possible = [
    getPath(
      item.billing,
      'subscriptions',
    ),

    getPath(
      item.billing,
      'items',
    ),
  ];

  for (const value of possible) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

export function ClientPortalPage({
  onLogout,
}: ClientPortalPageProps) {
  const query = useQuery({
    queryKey: ['client-portal'],
    queryFn: getClientPortal,
    staleTime: 30_000,
  });

  const [
    selectedTraineeId,
    setSelectedTraineeId,
  ] = useState('');

  const [
    activeSection,
    setActiveSection,
  ] = useState<PortalSection>('home');

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const openPortalSection = (
    section: PortalSection,
  ) => {
    setActiveSection(section);
    setSidebarOpen(false);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const data = query.data;

  useEffect(() => {
    if (
      !data ||
      selectedTraineeId
    ) {
      return;
    }

    const primary =
      data.trainees.find(
        (item) =>
          item.link.isPrimary,
      ) ??
      data.trainees[0];

    setSelectedTraineeId(
      primary?.trainee.id ?? '',
    );
  }, [
    data,
    selectedTraineeId,
  ]);

  const selected =
    useMemo(
      () =>
        data?.trainees.find(
          (item) =>
            item.trainee.id ===
            selectedTraineeId,
        ) ??
        data?.trainees[0],
      [
        data,
        selectedTraineeId,
      ],
    );

  const enrollments =
    selected?.enrollments ?? [];

  const attendance =
    selected?.attendance;

  const subscriptions =
    selected?.subscriptions?.length
      ? selected.subscriptions
      : selected
        ? subscriptionList(selected)
        : [];

  const activeSubscription =
    selected?.activeSubscription ??
    subscriptions.find(
      (subscription) =>
        textValue(
          getPath(
            subscription,
            'status',
          ),
          '',
        ) === 'ACTIVE',
    ) ??
    subscriptions[0] ??
    null;

  const totalPaid =
    subscriptions.reduce<number>(
      (sum, subscription) =>
        sum +
        numberValue(
          getPath(
            subscription,
            'paidAmount',
          ),
        ),
      0,
    );

  const totalBalance =
    subscriptions.reduce<number>(
      (sum, subscription) =>
        sum +
        numberValue(
          getPath(
            subscription,
            'balanceAmount',
          ),
        ),
      0,
    );

  const payments =
    selected?.payments?.length
      ? selected.payments
      : subscriptions.flatMap(
          (subscription) =>
            asArray(
              getPath(
                subscription,
                'payments',
              ),
            ),
        );

  if (query.isPending) {
    return (
      <main
        className="client-portal-state"
        dir="rtl"
      >
        <div className="client-portal-loader" />

        <h1>
          جارٍ تحميل البوابة
        </h1>

        <p>
          يتم تجهيز بيانات الاشتراك
          والحضور والمواعيد.
        </p>
      </main>
    );
  }

  if (
    query.isError ||
    !data
  ) {
    return (
      <main
        className="client-portal-state"
        dir="rtl"
      >
        <h1>
          تعذر فتح البوابة
        </h1>

        <p>
          {getPortalApiError(
            query.error,
          )}
        </p>

        <div className="client-portal-state-actions">
          <button
            type="button"
            onClick={() =>
              void query.refetch()
            }
          >
            إعادة المحاولة
          </button>

          <button
            type="button"
            className="secondary"
            onClick={onLogout}
          >
            تسجيل الخروج
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="client-portal-page client-portal-dashboard-v1"
      dir="rtl"
    >
      <div className="client-portal-dashboard-shell">

        <button
          type="button"
          aria-label="إغلاق القائمة"
          className={`client-sidebar-overlay ${
            sidebarOpen
              ? 'is-open'
              : ''
          }`}
          onClick={() =>
            setSidebarOpen(false)
          }
        />

        <aside
          className={`client-dashboard-sidebar ${
            sidebarOpen
              ? 'is-open'
              : ''
          }`}
        >

          <div className="client-sidebar-brand">

            <div className="client-sidebar-logo">
              H
            </div>

            <div>
              <strong>Haymclub</strong>
              <span>بوابة المتدرب</span>
            </div>

          </div>

          {selected && (
            <div className="client-sidebar-trainee">

              <div className="client-sidebar-avatar">
                {selected.trainee
                  .firstName
                  .charAt(0)}
              </div>

              <div>
                <strong>
                  {selected.trainee
                    .firstName}{' '}
                  {selected.trainee
                    .lastName}
                </strong>

                <span>
                  {
                    selected.trainee
                      .registrationCode
                  }
                </span>

                <small>
                  {data.user.email}
                </small>
              </div>

            </div>
          )}

          <nav className="client-sidebar-nav">

            <button
              type="button"
              className={
                activeSection === 'home'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                openPortalSection('home')
              }
            >
              <span>⌂</span>
              الرئيسية
            </button>

            <button
              type="button"
              className={
                activeSection === 'profile'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                openPortalSection('profile')
              }
            >
              <span>👤</span>
              ملفي الشخصي
            </button>

            <button
              type="button"
              className={
                activeSection ===
                'subscription'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                openPortalSection(
                  'subscription',
                )
              }
            >
              <span>💳</span>
              الاشتراك
            </button>

            <button
              type="button"
              className={
                activeSection ===
                'attendance'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                openPortalSection(
                  'attendance',
                )
              }
            >
              <span>✓</span>
              الحضور
            </button>

            <button
              type="button"
              className={
                activeSection ===
                'training'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                openPortalSection(
                  'training',
                )
              }
            >
              <span>⚽</span>
              المجموعة والمواعيد
            </button>

            <button
              type="button"
              className={
                activeSection ===
                'payments'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                openPortalSection(
                  'payments',
                )
              }
            >
              <span>⌁</span>
              المدفوعات
            </button>

            <div className="client-sidebar-divider" />

            <button
              type="button"
              className={
                activeSection ===
                'notifications'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                openPortalSection(
                  'notifications',
                )
              }
            >
              <span>🔔</span>
              الإشعارات
            </button>

            <button
              type="button"
              className={
                activeSection === 'feedback'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                openPortalSection('feedback')
              }
            >
              <span>✉</span>
              التواصل مع الأكاديمية
            </button>

            <button
              type="button"
              className={
                activeSection === 'gallery'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                openPortalSection('gallery')
              }
            >
              <span>▣</span>
              المعرض
            </button>

            <button
              type="button"
              className={
                activeSection === 'rankings'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                openPortalSection('rankings')
              }
            >
              <span>🏆</span>
              Top 10
            </button>

          </nav>

          <button
            type="button"
            className="client-sidebar-logout"
            onClick={onLogout}
          >
            <span>↪</span>
            تسجيل الخروج
          </button>

        </aside>

        <div className="client-dashboard-main">

      <header className="client-portal-header client-dashboard-header">

        <button
          type="button"
          className="client-mobile-menu"
          aria-label="فتح القائمة"
          onClick={() =>
            setSidebarOpen(true)
          }
        >
          ☰
        </button>
        <div className="client-portal-brand">
          <span>H</span>

          <div>
            <strong>
              Haymclub
            </strong>

            <small>
              بوابة ولي الأمر والمتدرب
            </small>
          </div>
        </div>

        <div className="client-portal-user">
          <div>
            <strong>
              {data.user.fullName}
            </strong>

            <span>
              {data.user.email}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      <div className="client-dashboard-page-heading">

        <div>
          <span>بوابة المتدرب</span>

          <h1>
            {
              portalSectionTitles[
                activeSection
              ]
            }
          </h1>
        </div>

        {activeSection !== 'home' && (
          <button
            type="button"
            onClick={() =>
              openPortalSection('home')
            }
          >
            العودة للرئيسية
          </button>
        )}

      </div>

      <section
        className={`client-portal-hero ${
          activeSection === 'home'
            ? ''
            : 'client-section-hidden'
        }`}
      >
        <div>
          <p>
            أهلاً بك في بوابة الأكاديمية
          </p>

          <h1>
            متابعة المتدرب
          </h1>

          <span>
            تابع الاشتراك والحضور
            والمجموعة والمواعيد من مكان
            واحد.
          </span>
        </div>

        {data.trainees.length > 1 && (
          <label>
            اختر المتدرب

            <select
              value={
                selectedTraineeId
              }
              onChange={(event) =>
                setSelectedTraineeId(
                  event.target.value,
                )
              }
            >
              {data.trainees.map(
                (item) => (
                  <option
                    key={
                      item.trainee.id
                    }
                    value={
                      item.trainee.id
                    }
                  >
                    {item.trainee
                      .firstName}{' '}
                    {item.trainee
                      .lastName}
                  </option>
                ),
              )}
            </select>
          </label>
        )}
      </section>

      {!selected ? (
        <section className="client-portal-empty">
          <div>👨‍👩‍👦</div>

          <h2>
            الحساب غير مربوط بمتدرب
          </h2>

          <p>
            تواصل مع إدارة الأكاديمية
            لربط الحساب بسجل المتدرب.
          </p>
        </section>
      ) : (
        <>
          <section
            className={`client-trainee-profile ${
              activeSection === 'profile'
                ? ''
                : 'client-section-hidden'
            }`}
          >
            <div className="client-trainee-avatar">
              {selected.trainee
                .firstName.charAt(0)}
            </div>

            <div>
              <p>ملف المتدرب</p>

              <h2>
                {selected.trainee
                  .firstName}{' '}
                {selected.trainee
                  .lastName}
              </h2>

              <span>
                كود التسجيل:{' '}
                <strong>
                  {
                    selected.trainee
                      .registrationCode
                  }
                </strong>
              </span>
            </div>

            <div className="client-trainee-profile-details">
              <div>
                <span>الفرع</span>
                <strong>
                  {selected.trainee
                    .branch?.name ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>تاريخ الميلاد</span>
                <strong>
                  {formatDate(
                    selected.trainee
                      .dateOfBirth,
                  )}
                </strong>
              </div>

              <div>
                <span>الحالة</span>
                <strong>
                  {statusLabel(
                    selected.trainee
                      .status,
                  )}
                </strong>
              </div>
            </div>
          </section>
{/* HAYMCLUB_CLIENT_NOTIFICATIONS_PANEL */}
          <div
            className={
              activeSection === 'notifications'
                ? ''
                : 'client-section-hidden'
            }
          >
            <ClientNotificationsPanel />
          </div>

          <div
            className={
              activeSection === 'feedback'
                ? ''
                : 'client-section-hidden'
            }
          >
          <ClientFeedbackPanel
            traineeId={
              selected.trainee.id
            }

            traineeName={
              `${selected.trainee.firstName} ${selected.trainee.lastName}`.trim()
            }
          />
          </div>


          <div
            className={
              activeSection === 'gallery'
                ? ''
                : 'client-section-hidden'
            }
          >
            <ClientGalleryPanel />
          </div>

          <div
            className={
              activeSection === 'rankings'
                ? ''
                : 'client-section-hidden'
            }
          >
            <ClientTopTenPanel />
          </div>

          <section
            className={`client-portal-cards client-home-summary-cards ${
              activeSection === 'home'
                ? ''
                : 'client-section-hidden'
            }`}
          >
            <article
              className="client-summary-card"
              onClick={() =>
                openPortalSection(
                  'attendance',
                )
              }
            >
              <span className="blue">
                ✓
              </span>

              <div>
                <p>نسبة الحضور</p>

                <strong>
                  {formatNumber(
                    attendance
                      ?.attendanceRate ??
                      0,
                  )}
                  %
                </strong>

                <small>
                  {
                    attendance
                      ?.markedSessions ??
                    0
                  }{' '}
                  حصة مسجلة
                </small>
              </div>
            </article>

            <article
              className="client-summary-card"
              onClick={() =>
                openPortalSection(
                  'payments',
                )
              }
            >
              <span className="green">
                💳
              </span>

              <div>
                <p>المدفوع</p>

                <strong>
                  {formatMoney(
                    totalPaid,
                  )}
                </strong>

                <small>
                  {payments.length}{' '}
                  عملية دفع
                </small>
              </div>
            </article>

            <article
              className="client-summary-card"
              onClick={() =>
                openPortalSection(
                  'subscription',
                )
              }
            >
              <span className="red">
                !
              </span>

              <div>
                <p>الرصيد المتبقي</p>

                <strong>
                  {formatMoney(
                    totalBalance,
                  )}
                </strong>

                <small>
                  {
                    subscriptions.length
                  }{' '}
                  اشتراك
                </small>
              </div>
            </article>

            <article
              className="client-summary-card"
              onClick={() =>
                openPortalSection(
                  'training',
                )
              }
            >
              <span className="purple">
                ⚽
              </span>

              <div>
                <p>المجموعات</p>

                <strong>
                  {formatNumber(
                    enrollments.length,
                  )}
                </strong>

                <small>
                  مجموعة تدريبية
                </small>
              </div>
            </article>
          </section>

          <section
            className={`client-portal-grid client-portal-single-grid ${
              activeSection === 'training' ||
              activeSection === 'attendance'
                ? ''
                : 'client-section-hidden'
            }`}
          >
            <article
              className={`client-portal-panel ${
                activeSection === 'training'
                  ? ''
                  : 'client-portal-panel-hidden'
              }`}
            >
              <header>
                <div>
                  <p>التدريب</p>
                  <h2>
                    المجموعات والمواعيد
                  </h2>
                </div>
              </header>

              {enrollments.length ===
              0 ? (
                <div className="client-panel-empty">
                  لا يوجد تسجيل في
                  مجموعة حاليًا.
                </div>
              ) : (
                <div className="client-enrollments">
                  {enrollments.map(
                    (
                      enrollment,
                      index,
                    ) => {
                      const group =
                        enrollmentGroup(
                          enrollment,
                        );

                      const schedules =
                        asArray(
                          group.schedules,
                        );

                      return (
                        <section
                          key={
                            textValue(
                              getPath(
                                enrollment,
                                'id',
                              ),
                              `enrollment-${index}`,
                            )
                          }
                        >
                          <div className="client-group-title">
                            <div>
                              <strong>
                                {textValue(
                                  group.name,
                                )}
                              </strong>

                              <span>
                                {textValue(
                                  getPath(
                                    group,
                                    'program.name',
                                  ),
                                )}
                              </span>
                            </div>

                            <b>
                              {statusLabel(
                                getPath(
                                  enrollment,
                                  'status',
                                ),
                              )}
                            </b>
                          </div>

                          <div className="client-group-info">
                            <div>
                              <span>
                                المدرب
                              </span>

                              <strong>
                                {fullName(
                                  group.coach,
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                تاريخ الانضمام
                              </span>

                              <strong>
                                {formatDate(
                                  getPath(
                                    enrollment,
                                    'enrollmentDate',
                                  ),
                                )}
                              </strong>
                            </div>
                          </div>

                          <div className="client-schedules">
                            {schedules.length ===
                            0 ? (
                              <span>
                                لا توجد مواعيد
                                مسجلة
                              </span>
                            ) : (
                              schedules.map(
                                (
                                  schedule,
                                  scheduleIndex,
                                ) => (
                                  <div
                                    key={
                                      textValue(
                                        getPath(
                                          schedule,
                                          'id',
                                        ),
                                        `schedule-${scheduleIndex}`,
                                      )
                                    }
                                  >
                                    <strong>
                                      {textValue(
                                        getPath(
                                          schedule,
                                          'dayOfWeek',
                                        ),
                                      )}
                                    </strong>

                                    <span>
                                      {textValue(
                                        getPath(
                                          schedule,
                                          'startTime',
                                        ),
                                      )}
                                      {' - '}
                                      {textValue(
                                        getPath(
                                          schedule,
                                          'endTime',
                                        ),
                                      )}
                                    </span>

                                    <small>
                                      {textValue(
                                        getPath(
                                          schedule,
                                          'venueName',
                                        ),
                                        'الملعب غير محدد',
                                      )}
                                    </small>
                                  </div>
                                ),
                              )
                            )}
                          </div>
                        </section>
                      );
                    },
                  )}
                </div>
              )}
            </article>

            <article
              className={`client-portal-panel ${
                activeSection === 'attendance'
                  ? ''
                  : 'client-portal-panel-hidden'
              }`}
            >
              <header>
                <div>
                  <p>الحضور</p>
                  <h2>
                    ملخص الحضور والغياب
                  </h2>
                </div>
              </header>

              <div className="client-attendance-circle">
                <strong>
                  {formatNumber(
                    attendance
                      ?.attendanceRate ??
                      0,
                  )}
                  %
                </strong>

                <span>
                  معدل الحضور
                </span>
              </div>

              <div className="client-attendance-list">
                <div>
                  <span>حاضر</span>
                  <strong className="success">
                    {
                      attendance
                        ?.counts
                        .PRESENT ??
                      0
                    }
                  </strong>
                </div>

                <div>
                  <span>متأخر</span>
                  <strong className="warning">
                    {
                      attendance
                        ?.counts
                        .LATE ??
                      0
                    }
                  </strong>
                </div>

                <div>
                  <span>غائب</span>
                  <strong className="danger">
                    {
                      attendance
                        ?.counts
                        .ABSENT ??
                      0
                    }
                  </strong>
                </div>

                <div>
                  <span>معتذر</span>
                  <strong>
                    {
                      attendance
                        ?.counts
                        .EXCUSED ??
                      0
                    }
                  </strong>
                </div>
              </div>
            </article>
          </section>

          <section
            className={`client-portal-grid client-portal-single-grid ${
              activeSection === 'subscription' ||
              activeSection === 'payments'
                ? ''
                : 'client-section-hidden'
            }`}
          >
            <article
              className={`client-portal-panel client-subscription-panel ${
                activeSection === 'subscription'
                  ? ''
                  : 'client-portal-panel-hidden'
              }`}
            >
              <header>
                <div>
                  <p>الاشتراكات</p>

                  <h2>
                    الاشتراك الحالي
                  </h2>
                </div>
              </header>

              {!activeSubscription ? (
                <div className="client-panel-empty">
                  لا يوجد اشتراك مسجل
                  حاليًا.
                </div>
              ) : (
                <>
                  <div className="client-subscription-head">
                    <div>
                      <strong>
                        {textValue(
                          getPath(
                            activeSubscription,
                            'plan.name',
                          ),
                          'خطة الاشتراك',
                        )}
                      </strong>

                      <span>
                        {textValue(
                          getPath(
                            activeSubscription,
                            'subscriptionNumber',
                          ),
                        )}
                      </span>
                    </div>

                    <b>
                      {statusLabel(
                        getPath(
                          activeSubscription,
                          'status',
                        ),
                      )}
                    </b>
                  </div>

                  <div className="client-subscription-details">
                    <div>
                      <span>
                        تاريخ البداية
                      </span>

                      <strong>
                        {formatDate(
                          getPath(
                            activeSubscription,
                            'startDate',
                          ),
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        تاريخ النهاية
                      </span>

                      <strong>
                        {formatDate(
                          getPath(
                            activeSubscription,
                            'endDate',
                          ),
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        إجمالي الاشتراك
                      </span>

                      <strong>
                        {formatMoney(
                          numberValue(
                            getPath(
                              activeSubscription,
                              'totalAmount',
                            ),
                          ),
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        الرصيد
                      </span>

                      <strong className="danger">
                        {formatMoney(
                          numberValue(
                            getPath(
                              activeSubscription,
                              'balanceAmount',
                            ),
                          ),
                        )}
                      </strong>
                    </div>
                  </div>
                </>
              )}
            </article>

            <article
              className={`client-portal-panel ${
                activeSection === 'payments'
                  ? ''
                  : 'client-portal-panel-hidden'
              }`}
            >
              <header>
                <div>
                  <p>المدفوعات</p>

                  <h2>
                    آخر عمليات الدفع
                  </h2>
                </div>
              </header>

              {payments.length === 0 ? (
                <div className="client-panel-empty">
                  لا توجد عمليات دفع.
                </div>
              ) : (
                <div className="client-payments-list">
                  {payments
                    .slice(0, 6)
                    .map(
                      (
                        payment,
                        index,
                      ) => (
                        <div
                          key={
                            textValue(
                              getPath(
                                payment,
                                'id',
                              ),
                              `payment-${index}`,
                            )
                          }
                        >
                          <div>
                            <strong>
                              {formatMoney(
                                numberValue(
                                  getPath(
                                    payment,
                                    'amount',
                                  ),
                                ),
                              )}
                            </strong>

                            <span>
                              {textValue(
                                getPath(
                                  payment,
                                  'method',
                                ),
                              )}
                            </span>
                          </div>

                          <div>
                            <strong>
                              {textValue(
                                getPath(
                                  payment,
                                  'receiptNumber',
                                ),
                              )}
                            </strong>

                            <span>
                              {formatDate(
                                getPath(
                                  payment,
                                  'paidAt',
                                ),
                              )}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                </div>
              )}
            </article>
          </section>
        </>
      )}

        </div>
      </div>
    </main>
  );
}
