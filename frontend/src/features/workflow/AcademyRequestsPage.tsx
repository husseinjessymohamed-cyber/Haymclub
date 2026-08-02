import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getAcademyWorkflowFeedback,
  getWorkflowApiError,
  resolveWorkflowFeedback,
} from '../../lib/workflow-api';

import type {
  WorkflowFeedback,
} from '../../types/workflow';

import {
  WorkflowAttachmentPreview,
} from './WorkflowAttachmentPreview';

import './AcademyRequestsPage.css';

interface AcademyRequestsPageProps {
  onBack: () => void;
}

const TYPE_LABELS:
Record<string, string> = {
  GENERAL: 'ملاحظة عامة',
  PAYMENT_RECEIPT: 'إيصال دفع',
  ATTENDANCE: 'اعتراض على الحضور',
  PAYMENT: 'مشكلة اشتراك أو دفع',
  SCHEDULE: 'مشكلة في المواعيد',
  ACCOUNT: 'مشكلة في الحساب',
  GROUP: 'طلب تغيير المجموعة',
};

const STATUS_LABELS:
Record<string, string> = {
  OPEN: 'قيد المراجعة',
  RESOLVED: 'تم الرد والحل',
  CLOSED: 'مغلق',
};

function formatDate(
  value: string,
): string {
  const date = new Date(value);

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
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date);
}

export function AcademyRequestsPage({
  onBack,
}: AcademyRequestsPageProps) {
  const [items, setItems] =
    useState<WorkflowFeedback[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [statusFilter, setStatusFilter] =
    useState('ALL');

  const [typeFilter, setTypeFilter] =
    useState('ALL');

  const [responses, setResponses] =
    useState<Record<string, string>>({});

  const [savingId, setSavingId] =
    useState<string | null>(null);

  const loadRequests =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await getAcademyWorkflowFeedback();

        setItems(
          Array.isArray(result)
            ? result
            : [],
        );
      } catch (requestError) {
        setError(
          getWorkflowApiError(
            requestError,
          ),
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const visibleItems =
    useMemo(() => {
      return items.filter((item) => {
        const matchesStatus =
          statusFilter === 'ALL' ||
          item.status ===
            statusFilter;

        const matchesType =
          typeFilter === 'ALL' ||
          item.feedback_type ===
            typeFilter;

        return (
          matchesStatus &&
          matchesType
        );
      });
    }, [
      items,
      statusFilter,
      typeFilter,
    ]);

  async function handleResolve(
    item: WorkflowFeedback,
  ): Promise<void> {
    const response =
      responses[item.id]?.trim();

    if (!response) {
      setError(
        'اكتب رد إدارة الأكاديمية أولًا.',
      );

      return;
    }

    setSavingId(item.id);
    setError(null);
    setSuccess(null);

    try {
      await resolveWorkflowFeedback(
        item.id,
        response,
      );

      setResponses(
        (current) => ({
          ...current,
          [item.id]: '',
        }),
      );

      setSuccess(
        'تم إرسال رد الإدارة وإنهاء الطلب بنجاح.',
      );

      await loadRequests();
    } catch (requestError) {
      setError(
        getWorkflowApiError(
          requestError,
        ),
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main
      className="academy-requests-page"
      dir="rtl"
    >
      <header className="academy-requests-header">
        <div>
          <button
            type="button"
            className="academy-requests-back"
            onClick={onBack}
          >
            ← الرجوع إلى لوحة التحكم
          </button>

          <p>
            إدارة التواصل مع العملاء
          </p>

          <h1>
            طلبات المتدربين وأولياء الأمور
          </h1>

          <span>
            الملاحظات العامة وإيصالات الدفع
            والاعتراضات والصور المرفقة.
          </span>
        </div>

        <button
          type="button"
          className="academy-requests-refresh"
          disabled={loading}
          onClick={() =>
            void loadRequests()
          }
        >
          {loading
            ? 'جارٍ التحديث...'
            : '↻ تحديث الطلبات'}
        </button>
      </header>

      <section className="academy-requests-summary">
        <article>
          <span>
            إجمالي الطلبات
          </span>

          <strong>
            {items.length}
          </strong>
        </article>

        <article>
          <span>
            قيد المراجعة
          </span>

          <strong>
            {
              items.filter(
                (item) =>
                  item.status ===
                  'OPEN',
              ).length
            }
          </strong>
        </article>

        <article>
          <span>
            تم الرد والحل
          </span>

          <strong>
            {
              items.filter(
                (item) =>
                  item.status ===
                  'RESOLVED',
              ).length
            }
          </strong>
        </article>

        <article>
          <span>
            إيصالات الدفع
          </span>

          <strong>
            {
              items.filter(
                (item) =>
                  item.feedback_type ===
                  'PAYMENT_RECEIPT',
              ).length
            }
          </strong>
        </article>
      </section>

      <section className="academy-requests-toolbar">
        <label>
          حالة الطلب

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
          >
            <option value="ALL">
              كل الحالات
            </option>

            <option value="OPEN">
              قيد المراجعة
            </option>

            <option value="RESOLVED">
              تم الرد والحل
            </option>

            <option value="CLOSED">
              مغلق
            </option>
          </select>
        </label>

        <label>
          نوع الطلب

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value,
              )
            }
          >
            <option value="ALL">
              كل الأنواع
            </option>

            <option value="GENERAL">
              ملاحظة عامة
            </option>

            <option value="PAYMENT_RECEIPT">
              إيصال دفع
            </option>

            <option value="ATTENDANCE">
              اعتراض على الحضور
            </option>

            <option value="PAYMENT">
              مشكلة اشتراك أو دفع
            </option>

            <option value="SCHEDULE">
              مشكلة في المواعيد
            </option>

            <option value="ACCOUNT">
              مشكلة في الحساب
            </option>

            <option value="GROUP">
              طلب تغيير المجموعة
            </option>
          </select>
        </label>

        <strong>
          النتائج: {
            visibleItems.length
          }
        </strong>
      </section>

      {success && (
        <div className="academy-requests-message success">
          {success}
        </div>
      )}

      {error && (
        <div className="academy-requests-message error">
          {error}
        </div>
      )}

      {loading ? (
        <section className="academy-requests-state">
          جارٍ تحميل طلبات العملاء...
        </section>
      ) : visibleItems.length === 0 ? (
        <section className="academy-requests-state">
          لا توجد طلبات مطابقة للاختيار الحالي.
        </section>
      ) : (
        <section className="academy-requests-list">
          {visibleItems.map(
            (item) => (
              <article
                key={item.id}
                className="academy-request-card"
              >
                <header className="academy-request-card-header">
                  <div>
                    <span className="academy-request-type">
                      {
                        TYPE_LABELS[
                          item.feedback_type
                        ] ??
                        item.feedback_type
                      }
                    </span>

                    <h2>
                      {item.subject}
                    </h2>
                  </div>

                  <strong
                    className={
                      item.status ===
                      'RESOLVED'
                        ? 'resolved'
                        : item.status ===
                            'CLOSED'
                          ? 'closed'
                          : 'open'
                    }
                  >
                    {
                      STATUS_LABELS[
                        item.status
                      ] ??
                      item.status
                    }
                  </strong>
                </header>

                <section className="academy-request-information">
                  <div>
                    <span>
                      صاحب الطلب
                    </span>

                    <strong>
                      {item.creator_name ||
                        item.creator_email ||
                        'مستخدم بوابة العملاء'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      المتدرب
                    </span>

                    <strong>
                      {item.metadata
                        ?.traineeName ||
                        (
                          item.metadata
                            ?.traineeId
                            ? `رقم: ${
                                item.metadata
                                  .traineeId
                              }`
                            : '—'
                        )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      الفرع
                    </span>

                    <strong>
                      {item.branch_name ||
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      تاريخ الطلب
                    </span>

                    <strong>
                      {formatDate(
                        item.created_at,
                      )}
                    </strong>
                  </div>
                </section>

                <section className="academy-request-details">
                  <h3>
                    تفاصيل الطلب
                  </h3>

                  <p>
                    {item.message}
                  </p>
                </section>

                {item.metadata
                  ?.attachment && (
                  <section className="academy-request-attachment">
                    <h3>
                      الصورة المرفقة
                    </h3>

                    <WorkflowAttachmentPreview
                      feedbackId={
                        item.id
                      }
                      originalName={
                        item.metadata
                          .attachment
                          .originalName
                      }
                    />
                  </section>
                )}

                {item.admin_response && (
                  <section className="academy-request-admin-response">
                    <strong>
                      رد إدارة الأكاديمية
                    </strong>

                    <p>
                      {
                        item.admin_response
                      }
                    </p>

                    {item.resolved_at && (
                      <small>
                        تم الرد: {
                          formatDate(
                            item.resolved_at,
                          )
                        }
                      </small>
                    )}
                  </section>
                )}

                {item.status !==
                  'RESOLVED' &&
                  item.status !==
                    'CLOSED' && (
                  <section className="academy-request-response-form">
                    <label>
                      رد إدارة الأكاديمية

                      <textarea
                        value={
                          responses[
                            item.id
                          ] ?? ''
                        }
                        placeholder="اكتب الرد الذي سيظهر للمتدرب أو ولي الأمر..."
                        onChange={(
                          event,
                        ) =>
                          setResponses(
                            (current) => ({
                              ...current,

                              [item.id]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />
                    </label>

                    <button
                      type="button"
                      disabled={
                        savingId ===
                        item.id
                      }
                      onClick={() =>
                        void handleResolve(
                          item,
                        )
                      }
                    >
                      {savingId ===
                      item.id
                        ? 'جارٍ إرسال الرد...'
                        : 'إرسال الرد وإنهاء الطلب'}
                    </button>
                  </section>
                )}
              </article>
            ),
          )}
        </section>
      )}
    </main>
  );
}
