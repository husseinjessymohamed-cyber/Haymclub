import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { FormEvent } from 'react';

import {
  createAttendanceSession,
  deleteAttendanceSession,
  getAttendanceApiError,
  getAttendanceOptions,
  getAttendanceSession,
  getAttendanceSessions,
  getTraineeAttendanceStats,
  markSessionAttendance,
  updateAttendanceSession,
} from '../../lib/attendance-api';

import type {
  AttendanceRecord,
  AttendanceStatus,
  TraineeAttendanceStats,
  TrainingSession,
  TrainingSessionStatus,
} from '../../types/attendance';

import type {
  CoachOption,
  TrainingGroup,
} from '../../types/groups';

import './AttendancePage.css';

interface AttendancePageProps {
  onBack: () => void;
}

interface SessionFormState {
  groupId: string;
  coachId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  venueName: string;
  notes: string;
  generateRoster: boolean;
  status: TrainingSessionStatus;
  isActive: boolean;
}

interface RosterRow {
  traineeId: string;
  recordId: string;
  registrationCode: string;
  firstName: string;
  lastName: string;
  status: AttendanceStatus;
  notes: string;
}

const SESSION_STATUS_LABELS: Record<
  TrainingSessionStatus,
  string
> = {
  SCHEDULED: 'مجدولة',
  IN_PROGRESS: 'جارية',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
};

const ATTENDANCE_STATUS_LABELS: Record<
  AttendanceStatus,
  string
> = {
  NOT_MARKED: 'لم يُسجل',
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  LATE: 'متأخر',
  EXCUSED: 'معتذر',
};

function todayValue(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

const EMPTY_SESSION_FORM: SessionFormState = {
  groupId: '',
  coachId: '',
  sessionDate: todayValue(),
  startTime: '18:00',
  endTime: '19:00',
  venueName: '',
  notes: '',
  generateRoster: true,
  status: 'SCHEDULED',
  isActive: true,
};

function displayTime(value: string): string {
  return value.slice(0, 5);
}

function displayDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
  }).format(parsed);
}

function coachName(
  coach?: CoachOption | null,
): string {
  if (!coach) {
    return 'غير محدد';
  }

  return `${coach.firstName} ${coach.lastName}`;
}

function createRosterRows(
  records: AttendanceRecord[],
): RosterRow[] {
  return [...records]
    .sort((first, second) => {
      const firstName =
        `${first.trainee?.firstName ?? ''} ${first.trainee?.lastName ?? ''}`;

      const secondName =
        `${second.trainee?.firstName ?? ''} ${second.trainee?.lastName ?? ''}`;

      return firstName.localeCompare(
        secondName,
        'ar',
      );
    })
    .map((record) => ({
      traineeId: record.traineeId,
      recordId: record.id,
      registrationCode:
        record.trainee?.registrationCode ?? '—',
      firstName:
        record.trainee?.firstName ?? 'متدرب',
      lastName:
        record.trainee?.lastName ?? '',
      status: record.status,
      notes: record.notes ?? '',
    }));
}

export function AttendancePage({
  onBack,
}: AttendancePageProps) {
  const [sessions, setSessions] = useState<
    TrainingSession[]
  >([]);

  const [groups, setGroups] = useState<
    TrainingGroup[]
  >([]);

  const [coaches, setCoaches] = useState<
    CoachOption[]
  >([]);

  const [academyId, setAcademyId] = useState('');
  const [academyName, setAcademyName] =
    useState('');
  const [branchName, setBranchName] =
    useState('');

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] =
    useState('');
  const [statusFilter, setStatusFilter] =
    useState('');
  const [dateFrom, setDateFrom] =
    useState('');
  const [dateTo, setDateTo] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [formOpen, setFormOpen] =
    useState(false);

  const [editingSession, setEditingSession] =
    useState<TrainingSession | null>(null);

  const [sessionForm, setSessionForm] =
    useState<SessionFormState>(
      EMPTY_SESSION_FORM,
    );

  const [rosterSession, setRosterSession] =
    useState<TrainingSession | null>(null);

  const [rosterRows, setRosterRows] =
    useState<RosterRow[]>([]);

  const [stats, setStats] =
    useState<TraineeAttendanceStats | null>(
      null,
    );

  const [statsLoading, setStatsLoading] =
    useState(false);

  const loadSessions = useCallback(
    async (): Promise<void> => {
      setLoading(true);
      setError('');

      try {
        const result =
          await getAttendanceSessions({
            groupId:
              groupFilter || undefined,

            status: statusFilter
              ? (statusFilter as TrainingSessionStatus)
              : undefined,

            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          });

        setSessions(result);
      } catch (loadError: unknown) {
        setError(
          getAttendanceApiError(loadError),
        );
      } finally {
        setLoading(false);
      }
    },
    [
      dateFrom,
      dateTo,
      groupFilter,
      statusFilter,
    ],
  );

  useEffect(() => {
    void getAttendanceOptions()
      .then((options) => {
        setGroups(options.groups);
        setCoaches(options.coaches);

        setAcademyId(
          options.academyId ?? '',
        );

        setAcademyName(
          options.academyName ??
            'الأكاديمية الحالية',
        );

        setBranchName(
          options.branchName ??
            'الفرع الرئيسي',
        );
      })
      .catch((optionsError: unknown) => {
        setError(
          getAttendanceApiError(
            optionsError,
          ),
        );
      });
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const visibleSessions = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return sessions;
    }

    return sessions.filter((session) => {
      const searchableValues = [
        session.group?.name,
        session.group?.code,
        session.group?.program?.name,
        session.group?.program?.sport?.name,
        session.venueName,
        coachName(session.coach),
      ];

      return searchableValues.some(
        (value) =>
          value
            ?.toLowerCase()
            .includes(query),
      );
    });
  }, [search, sessions]);

  const statistics = useMemo(() => {
    const allRecords = sessions.flatMap(
      (session) =>
        session.attendanceRecords ?? [],
    );

    const marked = allRecords.filter(
      (record) =>
        record.status !== 'NOT_MARKED',
    );

    const attended = marked.filter(
      (record) =>
        record.status === 'PRESENT' ||
        record.status === 'LATE',
    );

    return {
      total: sessions.length,

      today: sessions.filter(
        (session) =>
          session.sessionDate ===
          todayValue(),
      ).length,

      completed: sessions.filter(
        (session) =>
          session.status === 'COMPLETED',
      ).length,

      attendanceRate:
        marked.length > 0
          ? Math.round(
              (attended.length /
                marked.length) *
                100,
            )
          : 0,
    };
  }, [sessions]);

  function applyGroupDefaults(
    groupId: string,
  ): void {
    const group = groups.find(
      (item) => item.id === groupId,
    );

    const schedule =
      group?.schedules?.find(
        (item) => item.isActive,
      ) ?? group?.schedules?.[0];

    setSessionForm((current) => ({
      ...current,
      groupId,
      coachId: group?.coachId ?? '',
      startTime: schedule
        ? displayTime(schedule.startTime)
        : current.startTime,
      endTime: schedule
        ? displayTime(schedule.endTime)
        : current.endTime,
      venueName:
        schedule?.venueName ??
        current.venueName,
    }));
  }

  function openCreateSession(): void {
    const defaultGroup =
      groups.find(
        (group) =>
          group.isActive &&
          group.status === 'ACTIVE',
      ) ?? groups[0];

    setEditingSession(null);

    setSessionForm({
      ...EMPTY_SESSION_FORM,
      groupId: defaultGroup?.id ?? '',
      coachId:
        defaultGroup?.coachId ?? '',
    });

    setFormOpen(true);
    setError('');
    setNotice('');

    if (defaultGroup) {
      window.setTimeout(() => {
        applyGroupDefaults(
          defaultGroup.id,
        );
      }, 0);
    }
  }

  function openEditSession(
    session: TrainingSession,
  ): void {
    setEditingSession(session);

    setSessionForm({
      groupId: session.groupId,
      coachId: session.coachId ?? '',
      sessionDate: session.sessionDate,
      startTime: displayTime(
        session.startTime,
      ),
      endTime: displayTime(
        session.endTime,
      ),
      venueName:
        session.venueName ?? '',
      notes: session.notes ?? '',
      generateRoster: false,
      status: session.status,
      isActive: session.isActive,
    });

    setFormOpen(true);
    setError('');
    setNotice('');
  }

  function closeSessionForm(): void {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditingSession(null);

    setSessionForm({
      ...EMPTY_SESSION_FORM,
      sessionDate: todayValue(),
    });
  }

  async function submitSession(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (
        sessionForm.startTime >=
        sessionForm.endTime
      ) {
        throw new Error(
          'وقت النهاية يجب أن يكون بعد وقت البداية',
        );
      }

      const selectedGroup = groups.find(
        (group) =>
          group.id ===
          sessionForm.groupId,
      );

      if (!selectedGroup) {
        throw new Error(
          'يجب اختيار مجموعة تدريبية',
        );
      }

      if (editingSession) {
        await updateAttendanceSession(
          editingSession.id,
          {
            coachId:
              sessionForm.coachId || null,

            sessionDate:
              sessionForm.sessionDate,

            startTime:
              sessionForm.startTime,

            endTime: sessionForm.endTime,

            venueName:
              sessionForm.venueName.trim() ||
              undefined,

            notes:
              sessionForm.notes.trim() ||
              undefined,

            status: sessionForm.status,

            isActive:
              sessionForm.isActive,
          },
        );

        setNotice(
          'تم تحديث الحصة بنجاح',
        );
      } else {
        if (!academyId) {
          throw new Error(
            'تعذر تحديد الأكاديمية الحالية',
          );
        }

        await createAttendanceSession({
          academyId,
          branchId:
            selectedGroup.branchId,
          groupId: selectedGroup.id,

          coachId:
            sessionForm.coachId || null,

          sessionDate:
            sessionForm.sessionDate,

          startTime:
            sessionForm.startTime,

          endTime:
            sessionForm.endTime,

          venueName:
            sessionForm.venueName.trim() ||
            undefined,

          notes:
            sessionForm.notes.trim() ||
            undefined,

          generateRoster:
            sessionForm.generateRoster,
        });

        setNotice(
          'تم إنشاء الحصة وكشف الحضور بنجاح',
        );
      }

      closeSessionForm();
      await loadSessions();
    } catch (submitError: unknown) {
      setError(
        getAttendanceApiError(
          submitError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function openRoster(
    session: TrainingSession,
  ): Promise<void> {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const completeSession =
        await getAttendanceSession(
          session.id,
        );

      setRosterSession(
        completeSession,
      );

      setRosterRows(
        createRosterRows(
          completeSession.attendanceRecords ??
            [],
        ),
      );
    } catch (rosterError: unknown) {
      setError(
        getAttendanceApiError(
          rosterError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  function updateRosterRow(
    traineeId: string,
    field: 'status' | 'notes',
    value: string,
  ): void {
    setRosterRows((current) =>
      current.map((row) =>
        row.traineeId === traineeId
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  }

  function setAllAttendance(
    status: AttendanceStatus,
  ): void {
    setRosterRows((current) =>
      current.map((row) => ({
        ...row,
        status,
      })),
    );
  }

  async function saveAttendance(): Promise<void> {
    if (!rosterSession) {
      return;
    }

    if (rosterRows.length === 0) {
      setError(
        'لا يوجد متدربون في كشف الحضور',
      );
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const updated =
        await markSessionAttendance(
          rosterSession.id,

          rosterRows.map((row) => ({
            traineeId: row.traineeId,
            status: row.status,
            notes:
              row.notes.trim() ||
              undefined,
          })),
        );

      setRosterSession(updated);

      setRosterRows(
        createRosterRows(
          updated.attendanceRecords ?? [],
        ),
      );

      setNotice(
        'تم حفظ الحضور والغياب بنجاح',
      );

      await loadSessions();
    } catch (attendanceError: unknown) {
      setError(
        getAttendanceApiError(
          attendanceError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeSessionStatus(
    session: TrainingSession,
    status: TrainingSessionStatus,
  ): Promise<void> {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      await updateAttendanceSession(
        session.id,
        {
          status,
        },
      );

      setNotice(
        'تم تحديث حالة الحصة',
      );

      await loadSessions();
    } catch (statusError: unknown) {
      setError(
        getAttendanceApiError(
          statusError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeSession(
    session: TrainingSession,
  ): Promise<void> {
    const confirmed = window.confirm(
      `هل تريد حذف حصة ${session.group?.name ?? ''} بتاريخ ${displayDate(session.sessionDate)}؟`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await deleteAttendanceSession(
        session.id,
      );

      setNotice(
        'تم حذف الحصة بنجاح',
      );

      await loadSessions();
    } catch (deleteError: unknown) {
      setError(
        getAttendanceApiError(
          deleteError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function openTraineeStats(
    traineeId: string,
  ): Promise<void> {
    setStatsLoading(true);
    setStats(null);
    setError('');

    try {
      const result =
        await getTraineeAttendanceStats(
          traineeId,
        );

      setStats(result);
    } catch (statsError: unknown) {
      setError(
        getAttendanceApiError(
          statsError,
        ),
      );
    } finally {
      setStatsLoading(false);
    }
  }

  function attendanceSummary(
    session: TrainingSession,
  ) {
    const records =
      session.attendanceRecords ?? [];

    return {
      total: records.length,

      present: records.filter(
        (record) =>
          record.status === 'PRESENT',
      ).length,

      absent: records.filter(
        (record) =>
          record.status === 'ABSENT',
      ).length,

      late: records.filter(
        (record) =>
          record.status === 'LATE',
      ).length,

      excused: records.filter(
        (record) =>
          record.status === 'EXCUSED',
      ).length,

      notMarked: records.filter(
        (record) =>
          record.status === 'NOT_MARKED',
      ).length,
    };
  }

  return (
    <main
      className="attendance-page"
      dir="rtl"
    >
      <header className="attendance-header">
        <div>
          <button
            type="button"
            className="attendance-back"
            onClick={onBack}
          >
            ← الرجوع إلى لوحة التحكم
          </button>

          <p className="attendance-eyebrow">
            متابعة التدريب
          </p>

          <h1>الحضور والغياب</h1>

          <p className="attendance-description">
            إنشاء الحصص وتسجيل حضور
            المتدربين ومتابعة نسب الالتزام.
          </p>
        </div>

        <button
          type="button"
          className="attendance-primary-button"
          onClick={openCreateSession}
        >
          ＋ إنشاء حصة
        </button>
      </header>

      <section className="attendance-context">
        <div>
          <span>الأكاديمية</span>
          <strong>
            {academyName ||
              'الأكاديمية الحالية'}
          </strong>
        </div>

        <div>
          <span>الفرع</span>
          <strong>
            {branchName ||
              'الفرع الرئيسي'}
          </strong>
        </div>
      </section>

      <section className="attendance-statistics">
        <article>
          <span>إجمالي الحصص</span>
          <strong>{statistics.total}</strong>
        </article>

        <article>
          <span>حصص اليوم</span>
          <strong>{statistics.today}</strong>
        </article>

        <article>
          <span>حصص مكتملة</span>
          <strong>
            {statistics.completed}
          </strong>
        </article>

        <article>
          <span>متوسط الحضور</span>
          <strong>
            {statistics.attendanceRate}%
          </strong>
        </article>
      </section>

      {(error || notice) && (
        <div
          className={
            error
              ? 'attendance-message attendance-error'
              : 'attendance-message attendance-success'
          }
        >
          {error || notice}
        </div>
      )}

      <section className="attendance-toolbar">
        <input
          type="search"
          value={search}
          placeholder="ابحث بالمجموعة أو المدرب أو الملعب"
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />

        <select
          value={groupFilter}
          onChange={(event) => {
            setGroupFilter(
              event.target.value,
            );
          }}
        >
          <option value="">
            كل المجموعات
          </option>

          {groups.map((group) => (
            <option
              key={group.id}
              value={group.id}
            >
              {group.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(
              event.target.value,
            );
          }}
        >
          <option value="">
            كل الحالات
          </option>
          <option value="SCHEDULED">
            مجدولة
          </option>
          <option value="IN_PROGRESS">
            جارية
          </option>
          <option value="COMPLETED">
            مكتملة
          </option>
          <option value="CANCELLED">
            ملغاة
          </option>
        </select>

        <input
          type="date"
          value={dateFrom}
          title="من تاريخ"
          onChange={(event) => {
            setDateFrom(
              event.target.value,
            );
          }}
        />

        <input
          type="date"
          value={dateTo}
          title="إلى تاريخ"
          onChange={(event) => {
            setDateTo(
              event.target.value,
            );
          }}
        />

        <button
          type="button"
          onClick={() =>
            void loadSessions()
          }
        >
          تحديث
        </button>
      </section>

      <section className="attendance-content">
        {loading ? (
          <div className="attendance-state">
            جارٍ تحميل الحصص...
          </div>
        ) : visibleSessions.length === 0 ? (
          <div className="attendance-state">
            <div className="attendance-empty-icon">
              📋
            </div>

            <h2>لا توجد حصص</h2>

            <p>
              أنشئ أول حصة لبدء تسجيل
              الحضور والغياب.
            </p>

            <button
              type="button"
              className="attendance-primary-button"
              onClick={openCreateSession}
            >
              إنشاء حصة
            </button>
          </div>
        ) : (
          <div className="attendance-sessions-grid">
            {visibleSessions.map(
              (session) => {
                const summary =
                  attendanceSummary(
                    session,
                  );

                return (
                  <article
                    className="attendance-session-card"
                    key={session.id}
                  >
                    <header>
                      <div>
                        <span className="attendance-session-date">
                          {displayDate(
                            session.sessionDate,
                          )}
                        </span>

                        <h2>
                          {session.group?.name ??
                            'مجموعة تدريبية'}
                        </h2>

                        <p>
                          {displayTime(
                            session.startTime,
                          )}
                          {' - '}
                          {displayTime(
                            session.endTime,
                          )}
                          {' • '}
                          {session.venueName ||
                            'المكان غير محدد'}
                        </p>
                      </div>

                      <span
                        className={`attendance-session-status attendance-session-status-${session.status.toLowerCase()}`}
                      >
                        {
                          SESSION_STATUS_LABELS[
                            session.status
                          ]
                        }
                      </span>
                    </header>

                    <div className="attendance-session-info">
                      <div>
                        <span>المدرب</span>
                        <strong>
                          {coachName(
                            session.coach,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>الرياضة</span>
                        <strong>
                          {session.group
                            ?.program?.sport
                            ?.name ?? '—'}
                        </strong>
                      </div>
                    </div>

                    <div className="attendance-counts">
                      <span className="present">
                        حاضر {summary.present}
                      </span>

                      <span className="absent">
                        غائب {summary.absent}
                      </span>

                      <span className="late">
                        متأخر {summary.late}
                      </span>

                      <span className="excused">
                        معتذر {summary.excused}
                      </span>

                      {summary.notMarked > 0 && (
                        <span className="not-marked">
                          لم يسجل{' '}
                          {summary.notMarked}
                        </span>
                      )}
                    </div>

                    <footer>
                      <button
                        type="button"
                        className="attendance-mark-button"
                        disabled={saving}
                        onClick={() =>
                          void openRoster(
                            session,
                          )
                        }
                      >
                        تسجيل الحضور
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openEditSession(
                            session,
                          )
                        }
                      >
                        تعديل
                      </button>

                      {session.status !==
                        'COMPLETED' &&
                        session.status !==
                          'CANCELLED' && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void changeSessionStatus(
                                session,
                                'COMPLETED',
                              )
                            }
                          >
                            إكمال
                          </button>
                        )}

                      <button
                        type="button"
                        className="danger"
                        disabled={saving}
                        onClick={() =>
                          void removeSession(
                            session,
                          )
                        }
                      >
                        حذف
                      </button>
                    </footer>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>

      {formOpen && (
        <div
          className="attendance-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeSessionForm();
            }
          }}
        >
          <section className="attendance-modal">
            <header>
              <div>
                <p>بيانات الحصة</p>

                <h2>
                  {editingSession
                    ? 'تعديل الحصة'
                    : 'إنشاء حصة جديدة'}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeSessionForm}
              >
                ×
              </button>
            </header>

            <form onSubmit={submitSession}>
              <div className="attendance-form-grid">
                <label>
                  المجموعة
                  <select
                    required
                    disabled={
                      Boolean(editingSession)
                    }
                    value={
                      sessionForm.groupId
                    }
                    onChange={(event) => {
                      applyGroupDefaults(
                        event.target.value,
                      );
                    }}
                  >
                    <option value="">
                      اختر المجموعة
                    </option>

                    {groups.map((group) => (
                      <option
                        key={group.id}
                        value={group.id}
                      >
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  المدرب
                  <select
                    value={
                      sessionForm.coachId
                    }
                    onChange={(event) => {
                      setSessionForm(
                        (current) => ({
                          ...current,
                          coachId:
                            event.target
                              .value,
                        }),
                      );
                    }}
                  >
                    <option value="">
                      بدون مدرب
                    </option>

                    {coaches.map((coach) => (
                      <option
                        key={coach.id}
                        value={coach.id}
                      >
                        {coach.firstName}{' '}
                        {coach.lastName}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  تاريخ الحصة
                  <input
                    required
                    type="date"
                    value={
                      sessionForm.sessionDate
                    }
                    onChange={(event) => {
                      setSessionForm(
                        (current) => ({
                          ...current,
                          sessionDate:
                            event.target
                              .value,
                        }),
                      );
                    }}
                  />
                </label>

                <label>
                  المكان
                  <input
                    maxLength={200}
                    value={
                      sessionForm.venueName
                    }
                    onChange={(event) => {
                      setSessionForm(
                        (current) => ({
                          ...current,
                          venueName:
                            event.target
                              .value,
                        }),
                      );
                    }}
                  />
                </label>

                <label>
                  وقت البداية
                  <input
                    required
                    type="time"
                    value={
                      sessionForm.startTime
                    }
                    onChange={(event) => {
                      setSessionForm(
                        (current) => ({
                          ...current,
                          startTime:
                            event.target
                              .value,
                        }),
                      );
                    }}
                  />
                </label>

                <label>
                  وقت النهاية
                  <input
                    required
                    type="time"
                    value={
                      sessionForm.endTime
                    }
                    onChange={(event) => {
                      setSessionForm(
                        (current) => ({
                          ...current,
                          endTime:
                            event.target
                              .value,
                        }),
                      );
                    }}
                  />
                </label>

                {editingSession && (
                  <label>
                    حالة الحصة
                    <select
                      value={
                        sessionForm.status
                      }
                      onChange={(event) => {
                        setSessionForm(
                          (current) => ({
                            ...current,
                            status:
                              event.target
                                .value as TrainingSessionStatus,
                          }),
                        );
                      }}
                    >
                      {Object.entries(
                        SESSION_STATUS_LABELS,
                      ).map(
                        ([value, label]) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                )}

                <label className="attendance-full-field">
                  ملاحظات
                  <textarea
                    rows={3}
                    maxLength={1500}
                    value={
                      sessionForm.notes
                    }
                    onChange={(event) => {
                      setSessionForm(
                        (current) => ({
                          ...current,
                          notes:
                            event.target
                              .value,
                        }),
                      );
                    }}
                  />
                </label>

                {!editingSession && (
                  <label className="attendance-checkbox">
                    <input
                      type="checkbox"
                      checked={
                        sessionForm.generateRoster
                      }
                      onChange={(event) => {
                        setSessionForm(
                          (current) => ({
                            ...current,
                            generateRoster:
                              event.target
                                .checked,
                          }),
                        );
                      }}
                    />

                    إنشاء كشف المتدربين
                    تلقائيًا
                  </label>
                )}

                {editingSession && (
                  <label className="attendance-checkbox">
                    <input
                      type="checkbox"
                      checked={
                        sessionForm.isActive
                      }
                      onChange={(event) => {
                        setSessionForm(
                          (current) => ({
                            ...current,
                            isActive:
                              event.target
                                .checked,
                          }),
                        );
                      }}
                    />

                    الحصة مفعلة
                  </label>
                )}
              </div>

              <footer>
                <button
                  type="button"
                  className="attendance-secondary-button"
                  disabled={saving}
                  onClick={closeSessionForm}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="attendance-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'جارٍ الحفظ...'
                    : editingSession
                      ? 'حفظ التعديلات'
                      : 'إنشاء الحصة'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {rosterSession && (
        <div className="attendance-overlay">
          <section className="attendance-modal attendance-roster-modal">
            <header>
              <div>
                <p>كشف الحضور</p>

                <h2>
                  {rosterSession.group?.name ??
                    'المجموعة'}
                </h2>

                <small>
                  {displayDate(
                    rosterSession.sessionDate,
                  )}
                  {' — '}
                  {displayTime(
                    rosterSession.startTime,
                  )}
                </small>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRosterSession(null);
                  setRosterRows([]);
                  setStats(null);
                }}
              >
                ×
              </button>
            </header>

            <div className="attendance-roster-tools">
              <button
                type="button"
                onClick={() =>
                  setAllAttendance(
                    'PRESENT',
                  )
                }
              >
                الكل حاضر
              </button>

              <button
                type="button"
                onClick={() =>
                  setAllAttendance(
                    'ABSENT',
                  )
                }
              >
                الكل غائب
              </button>

              <span>
                عدد المتدربين:{' '}
                <strong>
                  {rosterRows.length}
                </strong>
              </span>
            </div>

            {rosterRows.length === 0 ? (
              <div className="attendance-state">
                لا يوجد متدربون نشطون في
                كشف هذه الحصة.
              </div>
            ) : (
              <div className="attendance-roster-table-wrapper">
                <table className="attendance-roster-table">
                  <thead>
                    <tr>
                      <th>المتدرب</th>
                      <th>الكود</th>
                      <th>الحالة</th>
                      <th>ملاحظات</th>
                      <th>الإحصائيات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rosterRows.map(
                      (row) => (
                        <tr
                          key={row.traineeId}
                        >
                          <td>
                            <strong>
                              {row.firstName}{' '}
                              {row.lastName}
                            </strong>
                          </td>

                          <td>
                            <code>
                              {
                                row.registrationCode
                              }
                            </code>
                          </td>

                          <td>
                            <select
                              className={`attendance-select-${row.status.toLowerCase()}`}
                              value={
                                row.status
                              }
                              onChange={(
                                event,
                              ) => {
                                updateRosterRow(
                                  row.traineeId,
                                  'status',
                                  event.target
                                    .value,
                                );
                              }}
                            >
                              {Object.entries(
                                ATTENDANCE_STATUS_LABELS,
                              ).map(
                                ([
                                  value,
                                  label,
                                ]) => (
                                  <option
                                    key={
                                      value
                                    }
                                    value={
                                      value
                                    }
                                  >
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </td>

                          <td>
                            <input
                              maxLength={1000}
                              value={
                                row.notes
                              }
                              placeholder="ملاحظة اختيارية"
                              onChange={(
                                event,
                              ) => {
                                updateRosterRow(
                                  row.traineeId,
                                  'notes',
                                  event.target
                                    .value,
                                );
                              }}
                            />
                          </td>

                          <td>
                            <button
                              type="button"
                              onClick={() =>
                                void openTraineeStats(
                                  row.traineeId,
                                )
                              }
                            >
                              عرض
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <footer className="attendance-roster-footer">
              <button
                type="button"
                className="attendance-secondary-button"
                onClick={() => {
                  setRosterSession(null);
                  setRosterRows([]);
                  setStats(null);
                }}
              >
                إغلاق
              </button>

              <button
                type="button"
                className="attendance-primary-button"
                disabled={
                  saving ||
                  rosterRows.length === 0
                }
                onClick={() =>
                  void saveAttendance()
                }
              >
                {saving
                  ? 'جارٍ الحفظ...'
                  : 'حفظ كشف الحضور'}
              </button>
            </footer>
          </section>
        </div>
      )}

      {(stats || statsLoading) && (
        <div
          className="attendance-stats-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setStats(null);
            }
          }}
        >
          <section className="attendance-stats-modal">
            {statsLoading ? (
              <p>
                جارٍ تحميل الإحصائيات...
              </p>
            ) : stats ? (
              <>
                <header>
                  <div>
                    <p>
                      إحصائيات المتدرب
                    </p>

                    <h2>
                      {
                        stats.trainee
                          .firstName
                      }{' '}
                      {
                        stats.trainee
                          .lastName
                      }
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setStats(null)
                    }
                  >
                    ×
                  </button>
                </header>

                <div className="attendance-rate">
                  <strong>
                    {stats.attendanceRate}%
                  </strong>
                  <span>نسبة الحضور</span>
                </div>

                <div className="attendance-stats-grid">
                  <div>
                    <span>
                      إجمالي الحصص
                    </span>
                    <strong>
                      {stats.totalSessions}
                    </strong>
                  </div>

                  <div>
                    <span>
                      الحصص المسجلة
                    </span>
                    <strong>
                      {stats.markedSessions}
                    </strong>
                  </div>

                  <div>
                    <span>حاضر</span>
                    <strong>
                      {
                        stats.counts
                          .PRESENT
                      }
                    </strong>
                  </div>

                  <div>
                    <span>غائب</span>
                    <strong>
                      {
                        stats.counts
                          .ABSENT
                      }
                    </strong>
                  </div>

                  <div>
                    <span>متأخر</span>
                    <strong>
                      {
                        stats.counts
                          .LATE
                      }
                    </strong>
                  </div>

                  <div>
                    <span>معتذر</span>
                    <strong>
                      {
                        stats.counts
                          .EXCUSED
                      }
                    </strong>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}
    </main>
  );
}
