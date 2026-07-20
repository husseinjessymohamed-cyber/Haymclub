import {
  createTrainingProgram,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  SportOption, FormEvent } from 'react';

import {
  addTrainingGroupSchedule,
  createTrainingGroup,
  deleteTrainingGroup,
  deleteTrainingGroupSchedule,
  getGroupOptions,
  getGroupsApiError,
  getTrainingGroups,
  updateTrainingGroup,
} from '../../lib/groups-api';

import type {
  BranchOption,
  CoachOption,
  CreateScheduleInput,
  TrainingDay,
  TrainingGroup,
  TrainingGroupStatus,
  TrainingProgramOption,
} from '../../types/groups';

import './GroupsPage.css';

interface GroupsPageProps {
  onBack: () => void;
}

interface GroupFormState {
  branchId: string;
  sportId: string;
  coachId: string;
  name: string;
  code: string;
  capacity: string;
  status: TrainingGroupStatus;
  notes: string;
  isActive: boolean;
  schedules: CreateScheduleInput[];
}

interface ScheduleFormState {
  dayOfWeek: TrainingDay;
  startTime: string;
  endTime: string;
  venueName: string;
  isActive: boolean;
}

const EMPTY_SCHEDULE: ScheduleFormState = {
  dayOfWeek: 'SATURDAY',
  startTime: '18:00',
  endTime: '19:00',
  venueName: '',
  isActive: true,
};

const EMPTY_FORM: GroupFormState = {
  branchId: '',
  sportId: '',
  coachId: '',
  name: '',
  code: '',
  capacity: '20',
  status: 'ACTIVE',
  notes: '',
  isActive: true,
  schedules: [],
};

const DAY_LABELS: Record<TrainingDay, string> = {
  SATURDAY: 'السبت',
  SUNDAY: 'الأحد',
  MONDAY: 'الاثنين',
  TUESDAY: 'الثلاثاء',
  WEDNESDAY: 'الأربعاء',
  THURSDAY: 'الخميس',
  FRIDAY: 'الجمعة',
};

const STATUS_LABELS: Record<
  TrainingGroupStatus,
  string
> = {
  ACTIVE: 'نشطة',
  PAUSED: 'متوقفة',
  COMPLETED: 'مكتملة',
};

function displayTime(value: string): string {
  return value.slice(0, 5);
}

function coachName(
  coach?: CoachOption | null,
): string {
  if (!coach) {
    return 'بدون مدرب';
  }

  return `${coach.firstName} ${coach.lastName}`;
}

export function GroupsPage({
  onBack,
}: GroupsPageProps) {
  const [groups, setGroups] = useState<
    TrainingGroup[]
  >([]);

  const [branches, setBranches] = useState<
    BranchOption[]
  >([]);

  const [programs, setPrograms] = useState<
    TrainingProgramOption[]
  >([]);

  const [sports, setSports] = useState<
    SportOption[]
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
  const [branchFilter, setBranchFilter] =
    useState('');
  const [programFilter, setProgramFilter] =
    useState('');
  const [statusFilter, setStatusFilter] =
    useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [formOpen, setFormOpen] =
    useState(false);

  const [editingGroup, setEditingGroup] =
    useState<TrainingGroup | null>(null);

  const [form, setForm] =
    useState<GroupFormState>(EMPTY_FORM);

  const [scheduleGroup, setScheduleGroup] =
    useState<TrainingGroup | null>(null);

  const [scheduleForm, setScheduleForm] =
    useState<ScheduleFormState>(
      EMPTY_SCHEDULE,
    );

  const loadOptions = useCallback(async () => {
    const result = await getGroupOptions();

    setBranches(result.branches);
    setPrograms(result.programs);
    setSports(result.sports);
    setCoaches(result.coaches);
    setAcademyId(result.academyId ?? '');
    setAcademyName(
      result.academyName ?? 'الأكاديمية الحالية',
    );
    setBranchName(
      result.branchName ?? 'الفرع الرئيسي',
    );

    return result;
  }, []);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getTrainingGroups({
        branchId: branchFilter || undefined,
        programId:
          programFilter || undefined,
        status: statusFilter
          ? (statusFilter as TrainingGroupStatus)
          : undefined,
      });

      setGroups(result);
    } catch (loadError: unknown) {
      setError(getGroupsApiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [
    branchFilter,
    programFilter,
    statusFilter,
  ]);

  useEffect(() => {
    void loadOptions()
      .then(() => loadGroups())
      .catch((loadError: unknown) => {
        setError(getGroupsApiError(loadError));
        setLoading(false);
      });
  }, [loadGroups, loadOptions]);

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return groups;
    }

    return groups.filter((group) => {
      const values = [
        group.name,
        group.code,
        group.branch?.name,
        group.program?.name,
        group.program?.sport?.name,
        coachName(group.coach),
      ];

      return values.some((value) =>
        value
          ?.toLowerCase()
          .includes(query),
      );
    });
  }, [groups, search]);

  const statistics = useMemo(() => {
    return {
      total: groups.length,

      active: groups.filter(
        (group) =>
          group.status === 'ACTIVE' &&
          group.isActive,
      ).length,

      paused: groups.filter(
        (group) =>
          group.status === 'PAUSED',
      ).length,

      completed: groups.filter(
        (group) =>
          group.status === 'COMPLETED',
      ).length,
    };
  }, [groups]);

  function openCreateForm(): void {
    const defaultBranch =
      branches.find((branch) => branch.isActive) ??
      branches[0];

    const defaultProgram =
      programs.find(
        (program) => program.isActive,
      ) ?? programs[0];

    const defaultSport =
      sports.find(
        (sport) =>
          sport.isActive !== false,
      ) ?? sports[0];

    setEditingGroup(null);

    setForm({
      ...EMPTY_FORM,
      branchId: defaultBranch?.id ?? '',
      sportId:
        defaultSport?.id ??
        defaultProgram?.sportId ??
        '',
    });

    setError('');
    setNotice('');
    setFormOpen(true);
  }

  function openEditForm(
    group: TrainingGroup,
  ): void {
    setEditingGroup(group);

    setForm({
      branchId: group.branchId,
      sportId:
        group.program?.sportId ??
        programs.find(
          (program) =>
            program.id === group.programId,
        )?.sportId ??
        '',
      coachId: group.coachId ?? '',
      name: group.name,
      code: group.code,
      capacity: String(group.capacity),
      status: group.status,
      notes: group.notes ?? '',
      isActive: group.isActive,
      schedules: [],
    });

    setError('');
    setNotice('');
    setFormOpen(true);
  }

  function closeForm(): void {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditingGroup(null);
    setForm(EMPTY_FORM);
  }

  function addCreateSchedule(): void {
    setForm((current) => ({
      ...current,

      schedules: [
        ...current.schedules,
        {
          ...EMPTY_SCHEDULE,
        },
      ],
    }));
  }

  function updateCreateSchedule(
    index: number,
    field: keyof CreateScheduleInput,
    value: string | boolean,
  ): void {
    setForm((current) => ({
      ...current,

      schedules: current.schedules.map(
        (schedule, scheduleIndex) =>
          scheduleIndex === index
            ? {
                ...schedule,
                [field]: value,
              }
            : schedule,
      ),
    }));
  }

  function removeCreateSchedule(
    index: number,
  ): void {
    setForm((current) => ({
      ...current,

      schedules:
        current.schedules.filter(
          (_, scheduleIndex) =>
            scheduleIndex !== index,
        ),
    }));
  }

  async function submitGroup(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const capacity = Number(form.capacity);

      if (
        !Number.isInteger(capacity) ||
        capacity < 1 ||
        capacity > 1000
      ) {
        throw new Error(
          'السعة يجب أن تكون رقمًا من 1 إلى 1000',
        );
      }

      const groupName =
        form.name.trim();

      const groupCode =
        form.code
          .trim()
          .toUpperCase();

      if (groupName.length < 2) {
        throw new Error(
          'اكتب اسم المجموعة',
        );
      }

      if (!form.sportId) {
        throw new Error(
          'اختر نوع الرياضة',
        );
      }

      if (!academyId) {
        throw new Error(
          'تعذر تحديد الأكاديمية الحالية',
        );
      }

      let resolvedProgramId:
        string;

      const existingProgram =
        programs.find(
          (program) =>
            program.sportId ===
              form.sportId &&
            program.name
              .trim()
              .toLowerCase() ===
              groupName.toLowerCase(),
        );

      if (existingProgram) {
        resolvedProgramId =
          existingProgram.id;
      } else {
        const suffix =
          Date.now()
            .toString(36)
            .toUpperCase();

        const programCodeBase =
          `PRG_${groupCode}`
            .replace(
              /[^A-Z0-9_-]/g,
              '_',
            )
            .slice(0, 34);

        const createdProgram =
          await createTrainingProgram({
            academyId,
            sportId:
              form.sportId,
            name:
              groupName,
            code:
              `${programCodeBase}_${suffix}`
                .slice(0, 50),
            sessionsPerWeek: 2,
            sessionDurationMinutes: 60,
            capacity,
            isActive: true,
          });

        resolvedProgramId =
          createdProgram.id;

        setPrograms(
          (current) => [
            ...current,
            createdProgram,
          ],
        );
      }

      if (editingGroup) {
        await updateTrainingGroup(
          editingGroup.id,
          {
            branchId: form.branchId,
            programId: resolvedProgramId,
            coachId: form.coachId || null,
            name: form.name.trim(),
            code: form.code
              .trim()
              .toUpperCase(),
            capacity,
            status: form.status,
            notes:
              form.notes.trim() || undefined,
            isActive: form.isActive,
          },
        );

        setNotice(
          'تم تحديث المجموعة بنجاح',
        );
      } else {
        if (!academyId) {
          throw new Error(
            'تعذر تحديد الأكاديمية الحالية',
          );
        }

        await createTrainingGroup({
          academyId,
          branchId: form.branchId,
          programId: resolvedProgramId,
          coachId: form.coachId || null,
          name: form.name.trim(),
          code: form.code
            .trim()
            .toUpperCase(),
          capacity,
          status: form.status,
          notes:
            form.notes.trim() || undefined,
          isActive: form.isActive,

          schedules:
            form.schedules.map(
              (schedule) => ({
                ...schedule,

                venueName:
                  schedule.venueName?.trim() ||
                  undefined,
              }),
            ),
        });

        setNotice(
          'تم إنشاء المجموعة بنجاح',
        );
      }

      closeForm();
      await loadGroups();
    } catch (submitError: unknown) {
      setError(
        getGroupsApiError(submitError),
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeGroup(
    group: TrainingGroup,
  ): Promise<void> {
    const confirmed = window.confirm(
      `هل تريد حذف مجموعة "${group.name}"؟`,
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await deleteTrainingGroup(group.id);

      setNotice(
        'تم حذف المجموعة بنجاح',
      );

      await loadGroups();
    } catch (removeError: unknown) {
      setError(
        getGroupsApiError(removeError),
      );
    }
  }

  function openSchedules(
    group: TrainingGroup,
  ): void {
    setScheduleGroup(group);
    setScheduleForm(EMPTY_SCHEDULE);
    setError('');
    setNotice('');
  }

  async function addSchedule(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!scheduleGroup) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (
        scheduleForm.startTime >=
        scheduleForm.endTime
      ) {
        throw new Error(
          'وقت النهاية يجب أن يكون بعد وقت البداية',
        );
      }

      const updated =
        await addTrainingGroupSchedule(
          scheduleGroup.id,
          {
            dayOfWeek:
              scheduleForm.dayOfWeek,
            startTime:
              scheduleForm.startTime,
            endTime: scheduleForm.endTime,
            venueName:
              scheduleForm.venueName.trim() ||
              undefined,
            isActive:
              scheduleForm.isActive,
          },
        );

      setScheduleGroup(updated);
      setScheduleForm(EMPTY_SCHEDULE);
      setNotice(
        'تمت إضافة الموعد بنجاح',
      );

      await loadGroups();
    } catch (scheduleError: unknown) {
      setError(
        getGroupsApiError(scheduleError),
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeSchedule(
    scheduleId: string,
  ): Promise<void> {
    if (!scheduleGroup) {
      return;
    }

    const confirmed = window.confirm(
      'هل تريد حذف هذا الموعد؟',
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await deleteTrainingGroupSchedule(
        scheduleGroup.id,
        scheduleId,
      );

      const refreshed =
        await getTrainingGroups();

      const updatedGroup =
        refreshed.find(
          (group) =>
            group.id ===
            scheduleGroup.id,
        ) ?? null;

      setGroups(refreshed);
      setScheduleGroup(updatedGroup);

      setNotice(
        'تم حذف الموعد بنجاح',
      );
    } catch (scheduleError: unknown) {
      setError(
        getGroupsApiError(scheduleError),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      className="groups-page"
      dir="rtl"
    >
      <header className="groups-header">
        <div>
          <button
            type="button"
            className="groups-back"
            onClick={onBack}
          >
            ← الرجوع إلى لوحة التحكم
          </button>

          <p className="groups-eyebrow">
            إدارة الأكاديمية
          </p>

          <h1>المجموعات التدريبية</h1>

          <p className="groups-description">
            إدارة المجموعات والمدربين
            والسعة وأيام ومواعيد التدريب.
          </p>
        </div>

        <button
          type="button"
          className="groups-primary-button"
          onClick={openCreateForm}
        >
          ＋ إنشاء مجموعة
        </button>
      </header>

      <section className="groups-context">
        <div>
          <span>الأكاديمية</span>
          <strong>
            {academyName ||
              'الأكاديمية الحالية'}
          </strong>
        </div>

        <div>
          <span>الفرع الرئيسي</span>
          <strong>
            {branchName ||
              'الفرع الحالي'}
          </strong>
        </div>
      </section>

      <section className="groups-statistics">
        <article>
          <span>إجمالي المجموعات</span>
          <strong>{statistics.total}</strong>
        </article>

        <article>
          <span>مجموعات نشطة</span>
          <strong>{statistics.active}</strong>
        </article>

        <article>
          <span>متوقفة مؤقتًا</span>
          <strong>{statistics.paused}</strong>
        </article>

        <article>
          <span>مجموعات مكتملة</span>
          <strong>
            {statistics.completed}
          </strong>
        </article>
      </section>

      {(error || notice) && (
        <div
          className={
            error
              ? 'groups-message groups-error'
              : 'groups-message groups-success'
          }
        >
          {error || notice}
        </div>
      )}

      <section className="groups-toolbar">
        <input
          type="search"
          value={search}
          placeholder="ابحث باسم المجموعة أو الكود أو المدرب"
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />

        <select
          value={branchFilter}
          onChange={(event) => {
            setBranchFilter(
              event.target.value,
            );
          }}
        >
          <option value="">
            كل الفروع
          </option>

          {branches.map((branch) => (
            <option
              key={branch.id}
              value={branch.id}
            >
              {branch.name}
            </option>
          ))}
        </select>

        <select
          value={programFilter}
          onChange={(event) => {
            setProgramFilter(
              event.target.value,
            );
          }}
        >
          <option value="">
            كل البرامج
          </option>

          {programs.map((program) => (
            <option
              key={program.id}
              value={program.id}
            >
              {program.name}
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
          <option value="ACTIVE">
            نشطة
          </option>
          <option value="PAUSED">
            متوقفة
          </option>
          <option value="COMPLETED">
            مكتملة
          </option>
        </select>

        <button
          type="button"
          onClick={() => void loadGroups()}
        >
          تحديث
        </button>
      </section>

      <section className="groups-content">
        {loading ? (
          <div className="groups-state">
            جارٍ تحميل المجموعات...
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="groups-state">
            <div className="groups-empty-icon">
              ⚽
            </div>

            <h2>لا توجد مجموعات</h2>

            <p>
              أنشئ أول مجموعة تدريبية
              داخل الأكاديمية.
            </p>

            <button
              type="button"
              className="groups-primary-button"
              onClick={openCreateForm}
            >
              إنشاء مجموعة
            </button>
          </div>
        ) : (
          <div className="groups-grid">
            {visibleGroups.map((group) => (
              <article
                className="group-card"
                key={group.id}
              >
                <header>
                  <div>
                    <span className="group-code">
                      {group.code}
                    </span>

                    <h2>{group.name}</h2>

                    <p>
                      {group.program?.sport
                        ?.name ?? 'رياضة'}
                      {' — '}
                      {group.program?.name ??
                        'برنامج تدريبي'}
                    </p>
                  </div>

                  <span
                    className={`group-status group-status-${group.status.toLowerCase()}`}
                  >
                    {STATUS_LABELS[
                      group.status
                    ]}
                  </span>
                </header>

                <div className="group-details">
                  <div>
                    <span>الفرع</span>
                    <strong>
                      {group.branch?.name ??
                        'غير محدد'}
                    </strong>
                  </div>

                  <div>
                    <span>المدرب</span>
                    <strong>
                      {coachName(group.coach)}
                    </strong>
                  </div>

                  <div>
                    <span>السعة</span>
                    <strong>
                      {group.capacity} متدرب
                    </strong>
                  </div>

                  <div>
                    <span>المواعيد</span>
                    <strong>
                      {group.schedules?.length ??
                        0}
                    </strong>
                  </div>
                </div>

                <div className="group-schedules-preview">
                  {(group.schedules ?? [])
                    .slice(0, 3)
                    .map((schedule) => (
                      <span key={schedule.id}>
                        {
                          DAY_LABELS[
                            schedule.dayOfWeek
                          ]
                        }
                        {' '}
                        {displayTime(
                          schedule.startTime,
                        )}
                      </span>
                    ))}

                  {(group.schedules?.length ??
                    0) === 0 && (
                    <span>
                      لا توجد مواعيد
                    </span>
                  )}
                </div>

                <footer>
                  <button
                    type="button"
                    onClick={() =>
                      openSchedules(group)
                    }
                  >
                    المواعيد
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openEditForm(group)
                    }
                  >
                    تعديل
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={() =>
                      void removeGroup(group)
                    }
                  >
                    حذف
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      {formOpen && (
        <div
          className="groups-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }
          }}
        >
          <section className="groups-modal">
            <header>
              <div>
                <p>بيانات المجموعة</p>

                <h2>
                  {editingGroup
                    ? 'تعديل المجموعة'
                    : 'إنشاء مجموعة جديدة'}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
              >
                ×
              </button>
            </header>

            <form onSubmit={submitGroup}>
              <div className="groups-form-grid">
                <label>
                  اسم المجموعة
                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    value={form.name}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }));
                    }}
                  />
                </label>

                <label>
                  كود المجموعة
                  <input
                    required
                    minLength={2}
                    maxLength={60}
                    pattern="[A-Za-z0-9_-]+"
                    value={form.code}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        code: event.target.value,
                      }));
                    }}
                  />
                </label>

                <label>
                  الفرع
                  <select
                    required
                    value={form.branchId}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        branchId:
                          event.target.value,
                      }));
                    }}
                  >
                    <option value="">
                      اختر الفرع
                    </option>

                    {branches.map((branch) => (
                      <option
                        key={branch.id}
                        value={branch.id}
                      >
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  نوع الرياضة

                  <select
                    required
                    value={form.sportId}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          sportId:
                            event.target.value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      اختر نوع الرياضة
                    </option>

                    {sports.map(
                      (sport) => (
                        <option
                          key={sport.id}
                          value={sport.id}
                        >
                          {sport.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  اسم البرنامج التدريبي

                  <input
                    type="text"
                    readOnly
                    value={form.name}
                    placeholder="سيظهر تلقائيًا من اسم المجموعة"
                  />

                  <small className="groups-auto-program-note">
                    يتم إنشاء البرنامج تلقائيًا بنفس اسم المجموعة.
                  </small>
                </label>

                <label>
                  المدرب
                  <select
                    value={form.coachId}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        coachId:
                          event.target.value,
                      }));
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
                  السعة
                  <input
                    required
                    type="number"
                    min={1}
                    max={1000}
                    value={form.capacity}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        capacity:
                          event.target.value,
                      }));
                    }}
                  />
                </label>

                <label>
                  الحالة
                  <select
                    value={form.status}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        status: event.target
                          .value as TrainingGroupStatus,
                      }));
                    }}
                  >
                    <option value="ACTIVE">
                      نشطة
                    </option>
                    <option value="PAUSED">
                      متوقفة
                    </option>
                    <option value="COMPLETED">
                      مكتملة
                    </option>
                  </select>
                </label>

                <label className="groups-checkbox">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        isActive:
                          event.target.checked,
                      }));
                    }}
                  />
                  المجموعة مفعلة
                </label>

                <label className="groups-full">
                  ملاحظات
                  <textarea
                    rows={3}
                    maxLength={1500}
                    value={form.notes}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        notes:
                          event.target.value,
                      }));
                    }}
                  />
                </label>
              </div>

              {!editingGroup && (
                <section className="create-schedules">
                  <div className="create-schedules-header">
                    <div>
                      <h3>
                        مواعيد التدريب
                      </h3>
                      <p>
                        يمكن إضافتها الآن أو
                        لاحقًا.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addCreateSchedule}
                    >
                      ＋ إضافة موعد
                    </button>
                  </div>

                  {form.schedules.map(
                    (schedule, index) => (
                      <div
                        className="create-schedule-row"
                        key={index}
                      >
                        <select
                          value={
                            schedule.dayOfWeek
                          }
                          onChange={(event) => {
                            updateCreateSchedule(
                              index,
                              'dayOfWeek',
                              event.target.value,
                            );
                          }}
                        >
                          {Object.entries(
                            DAY_LABELS,
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

                        <input
                          type="time"
                          value={
                            schedule.startTime
                          }
                          onChange={(event) => {
                            updateCreateSchedule(
                              index,
                              'startTime',
                              event.target.value,
                            );
                          }}
                        />

                        <input
                          type="time"
                          value={
                            schedule.endTime
                          }
                          onChange={(event) => {
                            updateCreateSchedule(
                              index,
                              'endTime',
                              event.target.value,
                            );
                          }}
                        />

                        <input
                          placeholder="اسم الملعب"
                          value={
                            schedule.venueName ??
                            ''
                          }
                          onChange={(event) => {
                            updateCreateSchedule(
                              index,
                              'venueName',
                              event.target.value,
                            );
                          }}
                        />

                        <button
                          type="button"
                          className="danger"
                          onClick={() =>
                            removeCreateSchedule(
                              index,
                            )
                          }
                        >
                          حذف
                        </button>
                      </div>
                    ),
                  )}
                </section>
              )}

              <footer>
                <button
                  type="button"
                  className="groups-secondary-button"
                  disabled={saving}
                  onClick={closeForm}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="groups-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'جارٍ الحفظ...'
                    : editingGroup
                      ? 'حفظ التعديلات'
                      : 'إنشاء المجموعة'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {scheduleGroup && (
        <div
          className="groups-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setScheduleGroup(null);
            }
          }}
        >
          <section className="groups-modal schedules-modal">
            <header>
              <div>
                <p>جدول التدريب</p>
                <h2>{scheduleGroup.name}</h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setScheduleGroup(null)
                }
              >
                ×
              </button>
            </header>

            <div className="existing-schedules">
              {(scheduleGroup.schedules ??
                []).map((schedule) => (
                <article key={schedule.id}>
                  <div>
                    <strong>
                      {
                        DAY_LABELS[
                          schedule.dayOfWeek
                        ]
                      }
                    </strong>

                    <span>
                      {displayTime(
                        schedule.startTime,
                      )}
                      {' - '}
                      {displayTime(
                        schedule.endTime,
                      )}
                    </span>

                    <small>
                      {schedule.venueName ||
                        'المكان غير محدد'}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="danger"
                    disabled={saving}
                    onClick={() =>
                      void removeSchedule(
                        schedule.id,
                      )
                    }
                  >
                    حذف
                  </button>
                </article>
              ))}

              {(scheduleGroup.schedules
                ?.length ?? 0) === 0 && (
                <p>
                  لا توجد مواعيد مسجلة.
                </p>
              )}
            </div>

            <form
              className="schedule-add-form"
              onSubmit={addSchedule}
            >
              <h3>إضافة موعد جديد</h3>

              <div>
                <label>
                  اليوم
                  <select
                    value={
                      scheduleForm.dayOfWeek
                    }
                    onChange={(event) => {
                      setScheduleForm(
                        (current) => ({
                          ...current,
                          dayOfWeek:
                            event.target
                              .value as TrainingDay,
                        }),
                      );
                    }}
                  >
                    {Object.entries(
                      DAY_LABELS,
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

                <label>
                  البداية
                  <input
                    required
                    type="time"
                    value={
                      scheduleForm.startTime
                    }
                    onChange={(event) => {
                      setScheduleForm(
                        (current) => ({
                          ...current,
                          startTime:
                            event.target.value,
                        }),
                      );
                    }}
                  />
                </label>

                <label>
                  النهاية
                  <input
                    required
                    type="time"
                    value={
                      scheduleForm.endTime
                    }
                    onChange={(event) => {
                      setScheduleForm(
                        (current) => ({
                          ...current,
                          endTime:
                            event.target.value,
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
                      scheduleForm.venueName
                    }
                    onChange={(event) => {
                      setScheduleForm(
                        (current) => ({
                          ...current,
                          venueName:
                            event.target.value,
                        }),
                      );
                    }}
                  />
                </label>
              </div>

              <button
                type="submit"
                className="groups-primary-button"
                disabled={saving}
              >
                إضافة الموعد
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
