import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import {
  createNotification,
  deleteNotification,
  getAdminNotifications,
} from '../../lib/notifications-api';

import type {
  NotificationAudience,
} from '../../types/notifications';

import './NotificationsPage.css';

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    'ar-EG',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value));
}

export function NotificationsPage() {
  const queryClient =
    useQueryClient();

  const [title, setTitle] =
    useState('');

  const [body, setBody] =
    useState('');

  const [audience, setAudience] =
    useState<NotificationAudience>(
      'ALL_TRAINEES',
    );

  const notificationsQuery =
    useQuery({
      queryKey: [
        'admin-notifications',
      ],
      queryFn:
        getAdminNotifications,
    });

  const createMutation =
    useMutation({
      mutationFn:
        createNotification,

      onSuccess: async () => {
        setTitle('');
        setBody('');
        setAudience(
          'ALL_TRAINEES',
        );

        await queryClient
          .invalidateQueries({
            queryKey: [
              'admin-notifications',
            ],
          });
      },
    });

  const deleteMutation =
    useMutation({
      mutationFn:
        deleteNotification,

      onSuccess: async () => {
        await queryClient
          .invalidateQueries({
            queryKey: [
              'admin-notifications',
            ],
          });
      },
    });

  function submit(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    createMutation.mutate({
      title,
      body,
      audience,
    });
  }

  return (
    <main
      className="notifications-page"
      dir="rtl"
    >
      <header className="notifications-header">
        <div>
          <p>التواصل مع المتدربين</p>
          <h1>الرسائل والإشعارات</h1>
          <span>
            أرسل تعليمات ومواعيد
            وتنبيهات إلى المتدربين.
          </span>
        </div>
      </header>

      <section className="notifications-layout">
        <form
          className="notification-compose"
          onSubmit={submit}
        >
          <h2>إرسال إشعار جديد</h2>

          <label>
            عنوان الإشعار

            <input
              value={title}
              maxLength={180}
              onChange={(event) =>
                setTitle(
                  event.target.value,
                )
              }
              required
            />
          </label>

          <label>
            نص الرسالة

            <textarea
              value={body}
              maxLength={5000}
              rows={7}
              onChange={(event) =>
                setBody(
                  event.target.value,
                )
              }
              required
            />
          </label>

          <label>
            المستلمون

            <select
              value={audience}
              onChange={(event) =>
                setAudience(
                  event.target
                    .value as
                    NotificationAudience,
                )
              }
            >
              <option value="ALL_TRAINEES">
                جميع متدربي الأكاديمية
              </option>

              <option value="BRANCH_TRAINEES">
                متدربو الفرع الحالي
              </option>
            </select>
          </label>

          {createMutation.isError && (
            <div className="notification-error">
              تعذر إرسال الإشعار.
              تأكد من اختيار فرع صالح.
            </div>
          )}

          {createMutation.isSuccess && (
            <div className="notification-success">
              تم إرسال الإشعار بنجاح.
            </div>
          )}

          <button
            type="submit"
            disabled={
              createMutation.isPending
            }
          >
            {createMutation.isPending
              ? 'جارٍ الإرسال...'
              : 'إرسال الإشعار'}
          </button>
        </form>

        <section className="notification-history">
          <header>
            <div>
              <p>سجل الإرسال</p>
              <h2>الإشعارات السابقة</h2>
            </div>

            <strong>
              {notificationsQuery
                .data?.length ?? 0}
            </strong>
          </header>

          {notificationsQuery.isPending && (
            <div className="notification-state">
              جارٍ تحميل الإشعارات...
            </div>
          )}

          {notificationsQuery.isError && (
            <div className="notification-error">
              تعذر تحميل الإشعارات.
            </div>
          )}

          {notificationsQuery.data?.length ===
            0 && (
            <div className="notification-state">
              لم يتم إرسال إشعارات بعد.
            </div>
          )}

          <div className="notification-list">
            {notificationsQuery.data?.map(
              (notification) => (
                <article
                  key={
                    notification.id
                  }
                >
                  <div className="notification-item-head">
                    <span>
                      {notification.audience ===
                      'ALL_TRAINEES'
                        ? 'كل المتدربين'
                        : 'متدربو الفرع'}
                    </span>

                    <time>
                      {formatDate(
                        notification
                          .publishedAt,
                      )}
                    </time>
                  </div>

                  <h3>
                    {notification.title}
                  </h3>

                  <p>
                    {notification.body}
                  </p>

                  <button
                    type="button"
                    className="notification-delete"
                    disabled={
                      deleteMutation
                        .isPending
                    }
                    onClick={() => {
                      if (
                        window.confirm(
                          'حذف هذا الإشعار؟',
                        )
                      ) {
                        deleteMutation
                          .mutate(
                            notification.id,
                          );
                      }
                    }}
                  >
                    حذف
                  </button>
                </article>
              ),
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
