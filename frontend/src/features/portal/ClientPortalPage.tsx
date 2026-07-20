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

import './ClientPortalPage.css';

interface ClientPortalPageProps {
  onLogout: () => void;
}

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
    selected
      ? subscriptionList(selected)
      : [];

  const activeSubscription =
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
    subscriptions[0];

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
    subscriptions.flatMap(
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
      className="client-portal-page"
      dir="rtl"
    >
      <header className="client-portal-header">
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

      <section className="client-portal-hero">
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
          <section className="client-trainee-profile">
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

          <section className="client-portal-cards">
            <article>
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

            <article>
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

            <article>
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

            <article>
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

          <section className="client-portal-grid">
            <article className="client-portal-panel">
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

            <article className="client-portal-panel">
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

          <section className="client-portal-grid">
            <article className="client-portal-panel client-subscription-panel">
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

            <article className="client-portal-panel">
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
    </main>
  );
}
