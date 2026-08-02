import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import {
  getMyWorkflowFeedback,
  getWorkflowApiError,
  submitWorkflowFeedbackWithFile,
} from '../../lib/workflow-api';

import type {
  WorkflowFeedback,
} from '../../types/workflow';

import {
  WorkflowAttachmentPreview,
} from './WorkflowAttachmentPreview';

interface ClientFeedbackPanelProps {
  traineeId?: string;
  traineeName?: string;
}

const FEEDBACK_STATUS_LABELS:
Record<string, string> = {
  OPEN: 'قيد المراجعة',
  RESOLVED: 'تم الحل',
  CLOSED: 'مغلقة',
};

const FEEDBACK_TYPE_LABELS:
Record<string, string> = {
  GENERAL: 'ملاحظة عامة',
  PAYMENT_RECEIPT: 'إيصال دفع',
  ATTENDANCE: 'اعتراض على الحضور',
  PAYMENT: 'مشكلة اشتراك أو دفع',
  SCHEDULE: 'مشكلة في المواعيد',
  ACCOUNT: 'مشكلة في الحساب',
  GROUP: 'طلب تغيير المجموعة',
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

export function ClientFeedbackPanel({
  traineeId,
  traineeName,
}: ClientFeedbackPanelProps) {
  const [feedbackType, setFeedbackType] =
    useState('GENERAL');

  const [subject, setSubject] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [attachment, setAttachment] =
    useState<File | null>(null);

  const attachmentInputRef =
    useRef<HTMLInputElement>(null);

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
      await submitWorkflowFeedbackWithFile(
        {
          type: feedbackType,

          subject:
            subject.trim() ||
            (
              feedbackType ===
              'PAYMENT_RECEIPT'
                ? 'إيصال دفع'
                : 'طلب من بوابة المتدرب'
            ),

          message:
            cleanMessage,

          entityType:
            'CLIENT_PORTAL',

          metadata: {
            traineeId:
              traineeId || undefined,

            traineeName:
              traineeName || undefined,
          },
        },
        attachment,
      );

      setSubject('');
      setMessage('');
      setAttachment(null);

      if (
        attachmentInputRef.current
      ) {
        attachmentInputRef.current.value =
          '';
      }

      setSuccess(
        'تم إرسال الطلب والصورة إلى إدارة الأكاديمية.',
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
            أرسل ملاحظة أو إيصال دفع أو اعتراضًا،
            وأرفق صورة عند الحاجة.
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

        <label>
          عنوان الطلب

          <input
            type="text"
            value={subject}
            placeholder={
              feedbackType ===
              'PAYMENT_RECEIPT'
                ? 'مثال: إيصال اشتراك شهر أغسطس'
                : 'مثال: مراجعة غياب يوم الأحد'
            }
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

        <label className="client-feedback-attachment">
          <span>
            إرفاق صورة
          </span>

          <input
            ref={attachmentInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file =
                event.target
                  .files?.[0] ??
                null;

              if (
                file &&
                file.size >
                  5 * 1024 * 1024
              ) {
                setAttachment(null);
                event.target.value = '';

                setError(
                  'حجم الصورة يجب ألا يزيد عن 5 ميجابايت.',
                );

                return;
              }

              setError(null);
              setAttachment(file);
            }}
          />

          <small>
            JPG أو PNG أو WEBP، بحد أقصى 5 ميجابايت.
          </small>

          {attachment && (
            <strong>
              تم اختيار: {
                attachment.name
              }
            </strong>
          )}
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
                <div>
                  <small className="client-feedback-type">
                    {
                      FEEDBACK_TYPE_LABELS[
                        item.feedback_type
                      ] ??
                      item.feedback_type
                    }
                  </small>

                  <strong>
                    {item.subject}
                  </strong>
                </div>

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

              {item.metadata
                ?.attachment && (
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
              )}

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
