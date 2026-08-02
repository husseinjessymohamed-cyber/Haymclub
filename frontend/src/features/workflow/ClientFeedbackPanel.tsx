import {
  useEffect,
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import {
  getMyWorkflowFeedback,
  getWorkflowApiError,
  submitWorkflowFeedback,
} from '../../lib/workflow-api';

import type {
  WorkflowFeedback,
} from '../../types/workflow';

const FEEDBACK_STATUS_LABELS:
Record<string, string> = {
  OPEN: 'قيد المراجعة',
  RESOLVED: 'تم الحل',
  CLOSED: 'مغلقة',
};

function formatDate(
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

export function ClientFeedbackPanel() {
  const [feedbackType, setFeedbackType] =
    useState('GENERAL');

  const [subject, setSubject] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [items, setItems] =
    useState<WorkflowFeedback[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  async function loadFeedback():
  Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const result =
        await getMyWorkflowFeedback();

      setItems(result);
    } catch (requestError) {
      setError(
        getWorkflowApiError(
          requestError,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeedback();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const cleanMessage =
      message.trim();

    if (!cleanMessage) {
      setError(
        'اكتب تفاصيل الطلب أولًا',
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await submitWorkflowFeedback({
        type: feedbackType,
        subject:
          subject.trim() ||
          'طلب من بوابة المتدرب',
        message: cleanMessage,
        entityType: 'CLIENT_PORTAL',
      });

      setSubject('');
      setMessage('');

      setSuccess(
        'تم إرسال الطلب وربطه بمهمة لدى إدارة الأكاديمية.',
      );

      await loadFeedback();
    } catch (requestError) {
      setError(
        getWorkflowApiError(
          requestError,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="client-feedback-panel"
      dir="rtl"
    >
      <header className="client-feedback-header">
        <div>
          <span>
            التغذية العكسية
          </span>

          <h2>
            تواصل مع إدارة الأكاديمية
          </h2>

          <p>
            أرسل ملاحظة أو اعتراضًا،
            وتابع رد الإدارة من نفس الصفحة.
          </p>
        </div>
      </header>

      <form
        className="client-feedback-form"
        onSubmit={(event) =>
          void handleSubmit(event)
        }
      >
        <label>
          نوع الطلب

          <select
            value={feedbackType}
            onChange={(event) =>
              setFeedbackType(
                event.target.value,
              )
            }
          >
            <option value="GENERAL">
              ملاحظة عامة
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

        <label>
          عنوان الطلب

          <input
            type="text"
            value={subject}
            placeholder="مثال: مراجعة غياب يوم الأحد"
            onChange={(event) =>
              setSubject(
                event.target.value,
              )
            }
          />
        </label>

        <label className="client-feedback-message">
          تفاصيل الطلب

          <textarea
            value={message}
            placeholder="اكتب تفاصيل الملاحظة أو المشكلة..."
            onChange={(event) =>
              setMessage(
                event.target.value,
              )
            }
          />
        </label>

        <button
          type="submit"
          disabled={
            submitting ||
            !message.trim()
          }
        >
          {submitting
            ? 'جارٍ إرسال الطلب...'
            : 'إرسال الطلب للإدارة'}
        </button>
      </form>

      {success && (
        <div className="client-feedback-success">
          {success}
        </div>
      )}

      {error && (
        <div className="client-feedback-error">
          {error}
        </div>
      )}

      <div className="client-feedback-history">
        <div className="client-feedback-history-title">
          <h3>
            طلباتي السابقة
          </h3>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void loadFeedback()
            }
          >
            تحديث
          </button>
        </div>

        {loading ? (
          <p>
            جارٍ تحميل الطلبات...
          </p>
        ) : items.length === 0 ? (
          <p>
            لا توجد طلبات سابقة.
          </p>
        ) : (
          items.map((item) => (
            <article key={item.id}>
              <header>
                <strong>
                  {item.subject}
                </strong>

                <span>
                  {
                    FEEDBACK_STATUS_LABELS[
                      item.status
                    ] ??
                    item.status
                  }
                </span>
              </header>

              <p>
                {item.message}
              </p>

              <small>
                {formatDate(
                  item.created_at,
                )}
              </small>

              {item.admin_response && (
                <div className="client-feedback-response">
                  <b>
                    رد إدارة الأكاديمية
                  </b>

                  <p>
                    {item.admin_response}
                  </p>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
