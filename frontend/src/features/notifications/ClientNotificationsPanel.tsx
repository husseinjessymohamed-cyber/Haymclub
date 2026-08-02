import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  getMyNotifications,
  markNotificationRead,
} from '../../lib/notifications-api';

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

export function ClientNotificationsPanel() {
  const queryClient =
    useQueryClient();

  const notificationsQuery =
    useQuery({
      queryKey: [
        'my-notifications',
      ],
      queryFn:
        getMyNotifications,
      refetchInterval: 60_000,
    });

  const markReadMutation =
    useMutation({
      mutationFn:
        markNotificationRead,

      onSuccess: async () => {
        await queryClient
          .invalidateQueries({
            queryKey: [
              'my-notifications',
            ],
          });
      },
    });

  const unreadCount =
    notificationsQuery.data
      ?.filter(
        (notification) =>
          !notification.isRead,
      )
      .length ?? 0;

  return (
    <section
      className="client-notifications-panel"
      dir="rtl"
    >
      <header>
        <div>
          <p>آخر أخبار الأكاديمية</p>
          <h2>الرسائل والإشعارات</h2>
        </div>

        {unreadCount > 0 && (
          <strong>
            {unreadCount} جديد
          </strong>
        )}
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
          لا توجد رسائل جديدة.
        </div>
      )}

      <div className="client-notification-list">
        {notificationsQuery.data?.map(
          (notification) => (
            <button
              type="button"
              key={notification.id}
              className={
                notification.isRead
                  ? 'client-notification read'
                  : 'client-notification unread'
              }
              onClick={() => {
                if (
                  !notification.isRead
                ) {
                  markReadMutation.mutate(
                    notification.id,
                  );
                }
              }}
            >
              <div>
                <h3>
                  {notification.title}
                </h3>

                <time>
                  {formatDate(
                    notification
                      .publishedAt,
                  )}
                </time>
              </div>

              <p>
                {notification.body}
              </p>

              {!notification.isRead && (
                <span>جديد</span>
              )}
            </button>
          ),
        )}
      </div>
    </section>
  );
}
