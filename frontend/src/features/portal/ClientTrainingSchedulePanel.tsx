import {
  useQuery,
} from '@tanstack/react-query';

import {
  getClientTrainingSchedule,
  getPortalApiError,
} from '../../lib/portal-api';

interface ClientTrainingSchedulePanelProps {
  traineeId: string;
}

const STATUS_LABELS:
Record<string, string> = {
  SCHEDULED: 'مجدولة',
  IN_PROGRESS: 'جارية',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
};

function formatDate(
  value: string,
): string {
  const date = new Date(
    `${value}T00:00:00`,
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  ).format(date);
}

function formatTime(
  value: string,
): string {
  if (!value) {
    return '—';
  }

  return value.slice(0, 5);
}

export function ClientTrainingSchedulePanel({
  traineeId,
}: ClientTrainingSchedulePanelProps) {
  const scheduleQuery = useQuery({
    queryKey: [
      'client-training-schedule',
      traineeId,
    ],

    queryFn: () =>
      getClientTrainingSchedule(
        traineeId,
      ),

    enabled:
      Boolean(traineeId),

    staleTime:
      30_000,
  });

  const sessions =
    scheduleQuery.data ?? [];

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const upcomingCount =
    sessions.filter(
      (session) =>
        session.sessionDate >= today &&
        session.status !==
          'CANCELLED',
    ).length;

  return (
    <section
      className="client-training-schedule"
      dir="rtl"
    >
      <header className="client-training-schedule-header">
        <div>
          <p>
            مواعيد التدريب
          </p>

          <h2>
            جدول الحصص والتمارين
          </h2>

          <span>
            كل الحصص التي أنشأتها إدارة
            الأكاديمية للمجموعات المشترك بها.
          </span>
        </div>

        <div className="client-training-schedule-count">
          <strong>
            {upcomingCount}
          </strong>

          <span>
            حصة قادمة
          </span>
        </div>
      </header>

      {scheduleQuery.isPending ? (
        <div className="client-training-schedule-state">
          جارٍ تحميل جدول التمارين...
        </div>
      ) : scheduleQuery.isError ? (
        <div className="client-training-schedule-state error">
          {getPortalApiError(
            scheduleQuery.error,
          )}
        </div>
      ) : sessions.length === 0 ? (
        <div className="client-training-schedule-state">
          لا توجد حصص تدريبية مسجلة
          لهذا المتدرب حاليًا.
        </div>
      ) : (
        <div className="client-training-schedule-list">
          {sessions.map(
            (session) => {
              const isPast =
                session.sessionDate <
                today;

              return (
                <article
                  key={session.id}
                  className={
                    isPast
                      ? 'client-training-session past'
                      : 'client-training-session upcoming'
                  }
                >
                  <header>
                    <div>
                      <span>
                        {session.sportName ||
                          'تدريب'}
                      </span>

                      <h3>
                        {session.groupName ||
                          'مجموعة تدريبية'}
                      </h3>
                    </div>

                    <strong
                      className={
                        session.status
                          .toLowerCase()
                      }
                    >
                      {
                        STATUS_LABELS[
                          session.status
                        ] ??
                        session.status
                      }
                    </strong>
                  </header>

                  <div className="client-training-session-details">
                    <div>
                      <span>
                        📅 التاريخ
                      </span>

                      <strong>
                        {formatDate(
                          session.sessionDate,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        🕒 وقت البداية
                      </span>

                      <strong>
                        {formatTime(
                          session.startTime,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        🕓 وقت النهاية
                      </span>

                      <strong>
                        {formatTime(
                          session.endTime,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        📍 المكان
                      </span>

                      <strong>
                        {session.venueName ||
                          'لم يتم تحديد المكان'}
                      </strong>
                    </div>

                    <div>
                      <span>
                        🏢 الفرع
                      </span>

                      <strong>
                        {session.branchName ||
                          '—'}
                      </strong>
                    </div>

                    <div>
                      <span>
                        👨‍🏫 المدرب
                      </span>

                      <strong>
                        {session.coachName?.trim() ||
                          'لم يتم تحديد المدرب'}
                      </strong>
                    </div>

                    <div>
                      <span>
                        ⚽ البرنامج
                      </span>

                      <strong>
                        {session.programName ||
                          '—'}
                      </strong>
                    </div>

                    <div>
                      <span>
                        🏅 الرياضة
                      </span>

                      <strong>
                        {session.sportName ||
                          '—'}
                      </strong>
                    </div>
                  </div>

                  <section className="client-training-session-notes">
                    <strong>
                      ملاحظات الحصة
                    </strong>

                    <p>
                      {session.notes?.trim() ||
                        'لا توجد ملاحظات إضافية.'}
                    </p>
                  </section>
                </article>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}
