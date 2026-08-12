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

import {
  api,
} from '../../lib/api';

// HAYMCLUB_PORTAL_AUTH_IMAGE_LOADER_V1

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
// HAYMCLUB_TRAINEE_BRANDING_LANG_V1

type PortalLanguage =
  | 'ar'
  | 'en';

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
Record<
  PortalLanguage,
  Record<PortalSection, string>
> = {
  ar: {
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
  },

  en: {
    home: 'Home',
    profile: 'My Profile',
    training: 'Group & Schedule',
    attendance: 'Attendance',
    subscription: 'Subscription',
    payments: 'Payments',
    notifications: 'Notifications',
    feedback: 'Contact Academy',
    gallery: 'Gallery',
    rankings: 'Top 10',
  },
};

const portalText = {
  ar: {
    traineePortal:
      'بوابة المتدرب',

    parentPortal:
      'بوابة ولي الأمر والمتدرب',

    logout:
      'تسجيل الخروج',

    returnHome:
      'العودة للرئيسية',

    welcome:
      'أهلاً بك في بوابة الأكاديمية',

    followTrainee:
      'متابعة المتدرب',

    heroBody:
      'تابع الاشتراك والحضور والمجموعة والمواعيد من مكان واحد.',

    chooseTrainee:
      'اختر المتدرب',

    noLinkedTitle:
      'الحساب غير مربوط بمتدرب',

    noLinkedBody:
      'تواصل مع إدارة الأكاديمية لربط الحساب بسجل المتدرب.',

    traineeProfile:
      'ملف المتدرب',

    registrationCode:
      'كود التسجيل',

    branch:
      'الفرع',

    birthDate:
      'تاريخ الميلاد',

    status:
      'الحالة',

    attendanceRate:
      'نسبة الحضور',

    recordedSessions:
      'حصة مسجلة',

    paid:
      'المدفوع',

    paymentOperation:
      'عملية دفع',

    balanceRemaining:
      'الرصيد المتبقي',

    subscription:
      'اشتراك',

    groups:
      'المجموعات',

    trainingGroup:
      'مجموعة تدريبية',

    training:
      'التدريب',

    groupsSchedule:
      'المجموعات والمواعيد',

    noEnrollment:
      'لا يوجد تسجيل في مجموعة حاليًا.',

    coach:
      'المدرب',

    joinDate:
      'تاريخ الانضمام',

    noSchedules:
      'لا توجد مواعيد مسجلة',

    venueUnknown:
      'الملعب غير محدد',

    attendance:
      'الحضور',

    attendanceSummary:
      'ملخص الحضور والغياب',

    attendanceRateLabel:
      'معدل الحضور',

    present:
      'حاضر',

    late:
      'متأخر',

    absent:
      'غائب',

    excused:
      'معتذر',

    subscriptions:
      'الاشتراكات',

    currentSubscription:
      'الاشتراك الحالي',

    noSubscription:
      'لا يوجد اشتراك مسجل حاليًا.',

    subscriptionPlan:
      'خطة الاشتراك',

    startDate:
      'تاريخ البداية',

    endDate:
      'تاريخ النهاية',

    totalSubscription:
      'إجمالي الاشتراك',

    balance:
      'الرصيد',

    payments:
      'المدفوعات',

    lastPayments:
      'آخر عمليات الدفع',

    noPayments:
      'لا توجد عمليات دفع.',

    loadingTitle:
      'جارٍ تحميل البوابة',

    loadingBody:
      'يتم تجهيز بيانات الاشتراك والحضور والمواعيد.',

    errorTitle:
      'تعذر فتح البوابة',

    retry:
      'إعادة المحاولة',

    arabic:
      'العربية',

    english:
      'English',
  },

  en: {
    traineePortal:
      'Trainee Portal',

    parentPortal:
      'Parent & Trainee Portal',

    logout:
      'Logout',

    returnHome:
      'Back to Home',

    welcome:
      'Welcome to your academy portal',

    followTrainee:
      'Trainee Dashboard',

    heroBody:
      'Track subscriptions, attendance, groups and schedules in one place.',

    chooseTrainee:
      'Choose Trainee',

    noLinkedTitle:
      'No trainee linked',

    noLinkedBody:
      'Contact the academy administration to link this account to a trainee.',

    traineeProfile:
      'Trainee Profile',

    registrationCode:
      'Registration Code',

    branch:
      'Branch',

    birthDate:
      'Date of Birth',

    status:
      'Status',

    attendanceRate:
      'Attendance Rate',

    recordedSessions:
      'recorded sessions',

    paid:
      'Paid',

    paymentOperation:
      'payments',

    balanceRemaining:
      'Remaining Balance',

    subscription:
      'subscriptions',

    groups:
      'Groups',

    trainingGroup:
      'training groups',

    training:
      'Training',

    groupsSchedule:
      'Groups & Schedule',

    noEnrollment:
      'No active group enrollment.',

    coach:
      'Coach',

    joinDate:
      'Join Date',

    noSchedules:
      'No schedules available',

    venueUnknown:
      'Venue not specified',

    attendance:
      'Attendance',

    attendanceSummary:
      'Attendance Summary',

    attendanceRateLabel:
      'Attendance Rate',

    present:
      'Present',

    late:
      'Late',

    absent:
      'Absent',

    excused:
      'Excused',

    subscriptions:
      'Subscriptions',

    currentSubscription:
      'Current Subscription',

    noSubscription:
      'No subscription is currently registered.',

    subscriptionPlan:
      'Subscription Plan',

    startDate:
      'Start Date',

    endDate:
      'End Date',

    totalSubscription:
      'Total Subscription',

    balance:
      'Balance',

    payments:
      'Payments',

    lastPayments:
      'Latest Payments',

    noPayments:
      'No payments found.',

    loadingTitle:
      'Loading Portal',

    loadingBody:
      'Preparing subscription, attendance and schedule data.',

    errorTitle:
      'Unable to open portal',

    retry:
      'Try Again',

    arabic:
      'العربية',

    english:
      'English',
  },
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
  language: PortalLanguage = 'ar',
): string {
  return new Intl.NumberFormat(
    language === 'ar'
      ? 'ar-EG'
      : 'en-US',
  ).format(value);
}

function formatDate(
  value: unknown,
  language: PortalLanguage = 'ar',
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
    language === 'ar'
      ? 'ar-EG'
      : 'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  ).format(date);
}

function formatMoney(
  value: number,
  language: PortalLanguage = 'ar',
): string {
  return new Intl.NumberFormat(
    language === 'ar'
      ? 'ar-EG'
      : 'en-US',
    {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function statusLabel(
  status: unknown,
  language: PortalLanguage = 'ar',
): string {
  const value =
    textValue(status);

  const arabic:
  Record<string, string> = {
    ACTIVE: 'نشط',
    PENDING: 'قيد الانتظار',
    PAUSED: 'متوقف مؤقتًا',
    EXPIRED: 'منتهي',
    CANCELLED: 'ملغي',
    COMPLETED: 'مكتمل',
    WAITLISTED: 'قائمة انتظار',
    INACTIVE: 'غير نشط',
  };

  const english:
  Record<string, string> = {
    ACTIVE: 'Active',
    PENDING: 'Pending',
    PAUSED: 'Paused',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
    WAITLISTED: 'Waitlisted',
    INACTIVE: 'Inactive',
  };

  return (
    language === 'ar'
      ? arabic[value]
      : english[value]
  ) ?? value;
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

function resolvePortalMediaUrl(
  value: string | null | undefined,
): string | null {
  const raw =
    value?.trim();

  if (!raw) {
    return null;
  }

  if (
    /^https?:\/\//i.test(raw) ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:')
  ) {
    return raw;
  }

  const configuredApi =
    String(
      import.meta.env
        .VITE_API_BASE_URL ??
      '',
    ).trim();

  const origin =
    configuredApi
      ? configuredApi
          .replace(
            /\/api\/?$/i,
            '',
          )
          .replace(
            /\/$/,
            '',
          )
      : window.location.origin;

  return `${origin}/${raw.replace(
    /^\/+/
    ,
    '',
  )}`;
}


function usePortalAuthenticatedImage(
  value:
    | string
    | null
    | undefined,
): string | null {
  const resolved =
    resolvePortalMediaUrl(
      value,
    );

  const [
    finalUrl,
    setFinalUrl,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!resolved) {
      setFinalUrl(null);

      return;
    }

    const isApiUpload =
      /\/api\/uploads\//i.test(
        resolved,
      );

    if (!isApiUpload) {
      setFinalUrl(resolved);

      return;
    }

    let cancelled =
      false;

    let objectUrl:
      string |
      null =
        null;

    setFinalUrl(null);

    void api
      .get(
        resolved,
        {
          responseType:
            'blob',
        },
      )
      .then(
        (
          response,
        ) => {
          if (cancelled) {
            return;
          }

          objectUrl =
            URL.createObjectURL(
              response.data,
            );

          setFinalUrl(
            objectUrl,
          );
        },
      )
      .catch(
        () => {
          if (!cancelled) {
            setFinalUrl(
              null,
            );
          }
        },
      );

    return () => {
      cancelled =
        true;

      if (objectUrl) {
        URL.revokeObjectURL(
          objectUrl,
        );
      }
    };
  }, [
    resolved,
  ]);

  return finalUrl;
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
    language,
    setLanguage,
  ] = useState<PortalLanguage>(
    () =>
      window.localStorage
        .getItem(
          'haymclub-portal-language',
        ) === 'en'
        ? 'en'
        : 'ar',
  );

  const isArabic =
    language === 'ar';

  const copy =
    portalText[language];

  const formatPortalNumber = (
    value: number,
  ) =>
    formatNumber(
      value,
      language,
    );

  const formatPortalDate = (
    value: unknown,
  ) =>
    formatDate(
      value,
      language,
    );

  const formatPortalMoney = (
    value: number,
  ) =>
    formatMoney(
      value,
      language,
    );

  const portalStatusLabel = (
    value: unknown,
  ) =>
    statusLabel(
      value,
      language,
    );

  useEffect(() => {
    window.localStorage.setItem(
      'haymclub-portal-language',
      language,
    );
  }, [
    language,
  ]);

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

  const activeAcademyMembership =
    data?.user.memberships.find(
      (membership) =>
        membership.isActive &&
        membership.academyId ===
          selected?.trainee.academyId,
    );

  const academyName =
    selected?.academy?.name ??
    activeAcademyMembership
      ?.academy?.name ??
    'Haymclub';

  const academyLogoUrl =
    usePortalAuthenticatedImage(
      selected?.academy?.logoUrl,
    );

  const traineeImageUrl =
    usePortalAuthenticatedImage(
      selected?.trainee
        .profileImageUrl,
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
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="client-portal-loader" />

        <h1>
          {copy.loadingTitle}
        </h1>

        <p>
          {copy.loadingBody}
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
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <h1>
          {copy.errorTitle}
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
            {copy.retry}
          </button>

          <button
            type="button"
            className="secondary"
            onClick={onLogout}
          >
            {copy.logout}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="client-portal-page client-portal-dashboard-v1"
      dir={isArabic ? 'rtl' : 'ltr'}
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
              {academyLogoUrl ? (
                <img
                  src={academyLogoUrl}
                  alt={academyName}
                />
              ) : (
                academyName
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>

            <div>
              <strong>
                {academyName}
              </strong>

              <span>
                {copy.traineePortal}
              </span>
            </div>

          </div>

          <div className="client-language-switch">
            <button
              type="button"
              className={
                language === 'ar'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setLanguage('ar')
              }
            >
              العربية
            </button>

            <button
              type="button"
              className={
                language === 'en'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setLanguage('en')
              }
            >
              English
            </button>
          </div>

          {selected && (
            <div className="client-sidebar-trainee">

              <div className="client-sidebar-avatar">
                {traineeImageUrl ? (
                  <img
                    src={traineeImageUrl}
                    alt={`${selected.trainee.firstName} ${selected.trainee.lastName}`}
                  />
                ) : (
                  selected.trainee
                    .firstName
                    .charAt(0)
                )}
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
              {portalSectionTitles[language].home}
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
              {portalSectionTitles[language].profile}
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
              {portalSectionTitles[language].subscription}
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
              {portalSectionTitles[language].attendance}
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
              {portalSectionTitles[language].training}
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
              {portalSectionTitles[language].payments}
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
              {portalSectionTitles[language].notifications}
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
              {portalSectionTitles[language].feedback}
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
              {portalSectionTitles[language].gallery}
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
          <span className="client-portal-brand-logo">
            {academyLogoUrl ? (
              <img
                src={academyLogoUrl}
                alt={academyName}
              />
            ) : (
              academyName
                .charAt(0)
                .toUpperCase()
            )}
          </span>

          <div>
            <strong>
              {academyName}
            </strong>

            <small>
              {copy.parentPortal}
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
          <span>{copy.traineePortal}</span>

          <h1>
            {
              portalSectionTitles[
                language
              ][
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
            {copy.returnHome}
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
            {copy.welcome}
          </p>

          <h1>
            {copy.followTrainee}
          </h1>

          <span>
            {copy.heroBody}
          </span>
        </div>

        {data.trainees.length > 1 && (
          <label>
            {copy.chooseTrainee}

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
            {copy.noLinkedTitle}
          </h2>

          <p>
            {copy.noLinkedBody}
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
              {traineeImageUrl ? (
                <img
                  src={traineeImageUrl}
                  alt={`${selected.trainee.firstName} ${selected.trainee.lastName}`}
                />
              ) : (
                selected.trainee
                  .firstName
                  .charAt(0)
              )}
            </div>

            <div>
              <p>{copy.traineeProfile}</p>

              <h2>
                {selected.trainee
                  .firstName}{' '}
                {selected.trainee
                  .lastName}
              </h2>

              <span>
                {copy.registrationCode}:{' '}
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
                <span>{copy.branch}</span>
                <strong>
                  {selected.trainee
                    .branch?.name ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>{copy.birthDate}</span>
                <strong>
                  {formatPortalDate(
                    selected.trainee
                      .dateOfBirth,
                  )}
                </strong>
              </div>

              <div>
                <span>{copy.status}</span>
                <strong>
                  {portalStatusLabel(
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
                <p>{copy.attendanceRate}</p>

                <strong>
                  {formatPortalNumber(
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
                  {copy.recordedSessions}
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
                <p>{copy.paid}</p>

                <strong>
                  {formatPortalMoney(
                    totalPaid,
                  )}
                </strong>

                <small>
                  {payments.length}{' '}
                  {copy.paymentOperation}
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
                <p>{copy.balanceRemaining}</p>

                <strong>
                  {formatPortalMoney(
                    totalBalance,
                  )}
                </strong>

                <small>
                  {
                    subscriptions.length
                  }{' '}
                  {copy.subscription}
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
                <p>{copy.groups}</p>

                <strong>
                  {formatPortalNumber(
                    enrollments.length,
                  )}
                </strong>

                <small>
                  {copy.trainingGroup}
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
                  <p>{copy.training}</p>
                  <h2>
                    {copy.groupsSchedule}
                  </h2>
                </div>
              </header>

              {enrollments.length ===
              0 ? (
                <div className="client-panel-empty">
                  {copy.noEnrollment}
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
                              {portalStatusLabel(
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
                                {copy.coach}
                              </span>

                              <strong>
                                {fullName(
                                  group.coach,
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                {copy.joinDate}
                              </span>

                              <strong>
                                {formatPortalDate(
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
                                {copy.noSchedules}
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
                  <p>{copy.attendance}</p>
                  <h2>
                    {copy.attendanceSummary}
                  </h2>
                </div>
              </header>

              <div className="client-attendance-circle">
                <strong>
                  {formatPortalNumber(
                    attendance
                      ?.attendanceRate ??
                      0,
                  )}
                  %
                </strong>

                <span>
                  {copy.attendanceRateLabel}
                </span>
              </div>

              <div className="client-attendance-list">
                <div>
                  <span>{copy.present}</span>
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
                  <span>{copy.late}</span>
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
                  <span>{copy.absent}</span>
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
                  <span>{copy.excused}</span>
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
                  <p>{copy.subscriptions}</p>

                  <h2>
                    {copy.currentSubscription}
                  </h2>
                </div>
              </header>

              {!activeSubscription ? (
                <div className="client-panel-empty">
                  {copy.noSubscription}
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
                      {portalStatusLabel(
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
                        {copy.startDate}
                      </span>

                      <strong>
                        {formatPortalDate(
                          getPath(
                            activeSubscription,
                            'startDate',
                          ),
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        {copy.endDate}
                      </span>

                      <strong>
                        {formatPortalDate(
                          getPath(
                            activeSubscription,
                            'endDate',
                          ),
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        {copy.totalSubscription}
                      </span>

                      <strong>
                        {formatPortalMoney(
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
                        {copy.balance}
                      </span>

                      <strong className="danger">
                        {formatPortalMoney(
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
                  <p>{copy.payments}</p>

                  <h2>
                    {copy.lastPayments}
                  </h2>
                </div>
              </header>

              {payments.length === 0 ? (
                <div className="client-panel-empty">
                  {copy.noPayments}
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
                              {formatPortalMoney(
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
                              {formatPortalDate(
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
