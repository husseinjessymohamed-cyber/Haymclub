import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createTrainee,
  deleteTrainee,
  getAcademyContext,
  getApiErrorMessage,
  getTrainees,
  updateTrainee,
} from '../../lib/trainees-api';

import type {
  AcademyContext,
  CreateTraineeInput,
  Trainee,
  TraineeGender,
  TraineeStatus,
  UpdateTraineeInput,
} from '../../types/trainees';

import './TraineesPage.css';

interface TraineesPageProps {
  onBack: () => void;
}

interface TraineeFormState {
  registrationCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: TraineeGender;
  phone: string;
  email: string;
  medicalNotes: string;
  emergencyNotes: string;
  status: TraineeStatus;
  isActive: boolean;
  branchId: string;
}

const EMPTY_FORM: TraineeFormState = {
  registrationCode: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'MALE',
  phone: '',
  email: '',
  medicalNotes: '',
  emergencyNotes: '',
  status: 'ACTIVE',
  isActive: true,
  branchId: '',
};

function calculateAge(dateOfBirth: string): string {
  const birthDate = new Date(dateOfBirth);

  if (Number.isNaN(birthDate.getTime())) {
    return '—';
  }

  const today = new Date();

  let age =
    today.getFullYear() - birthDate.getFullYear();

  const monthDifference =
    today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? `${age} سنة` : '—';
}

function getStatusLabel(status: TraineeStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'نشط';
    case 'PAUSED':
      return 'متوقف مؤقتًا';
    case 'INACTIVE':
      return 'غير نشط';
    default:
      return status;
  }
}

function getPrimaryGuardian(trainee: Trainee): string {
  const links = trainee.guardianLinks ?? [];

  const link =
    links.find((item) => item.isPrimary) ??
    links[0];

  if (!link?.guardian) {
    return 'غير مسجل';
  }

  return `${link.guardian.firstName} ${link.guardian.lastName}`;
}

function getCurrentGroup(trainee: Trainee): string {
  const enrollments = trainee.enrollments ?? [];

  const enrollment =
    enrollments.find(
      (item) => item.status === 'ACTIVE',
    ) ?? enrollments[0];

  return (
    enrollment?.group?.name ??
    enrollment?.group?.code ??
    'غير مسجل'
  );
}

export function TraineesPage({
  onBack,
}: TraineesPageProps) {
  const requestId = useRef(0);

  const [trainees, setTrainees] = useState<Trainee[]>(
    [],
  );

  const [context, setContext] =
    useState<AcademyContext>({});

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] =
    useState('');

  const [activeFilter, setActiveFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrainee, setEditingTrainee] =
    useState<Trainee | null>(null);

  const [form, setForm] =
    useState<TraineeFormState>(EMPTY_FORM);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [search]);

  useEffect(() => {
    void getAcademyContext()
      .then((academyContext) => {
        setContext(academyContext);
      })
      .catch((contextError: unknown) => {
        setError(getApiErrorMessage(contextError));
      });
  }, []);

  const loadTrainees = useCallback(async () => {
    const currentRequestId = ++requestId.current;

    setLoading(true);
    setError('');

    try {
      const result = await getTrainees({
        q: debouncedSearch || undefined,

        isActive:
          activeFilter === 'all'
            ? undefined
            : activeFilter === 'active',
      });

      if (currentRequestId === requestId.current) {
        setTrainees(result);
      }
    } catch (loadError: unknown) {
      if (currentRequestId === requestId.current) {
        setError(getApiErrorMessage(loadError));
      }
    } finally {
      if (currentRequestId === requestId.current) {
        setLoading(false);
      }
    }
  }, [activeFilter, debouncedSearch]);

  useEffect(() => {
    void loadTrainees();
  }, [loadTrainees]);

  const statistics = useMemo(() => {
    const active = trainees.filter(
      (trainee) => trainee.isActive,
    ).length;

    const paused = trainees.filter(
      (trainee) => trainee.status === 'PAUSED',
    ).length;

    return {
      total: trainees.length,
      active,
      inactive: trainees.length - active,
      paused,
    };
  }, [trainees]);

  function openCreateModal(): void {
    setEditingTrainee(null);

    setForm({
      ...EMPTY_FORM,
      branchId: context.branchId ?? '',
    });

    setError('');
    setNotice('');
    setModalOpen(true);
  }

  function openEditModal(trainee: Trainee): void {
    setEditingTrainee(trainee);

    setForm({
      registrationCode:
        trainee.registrationCode ?? '',

      firstName: trainee.firstName,
      lastName: trainee.lastName,
      dateOfBirth: trainee.dateOfBirth,
      gender: trainee.gender,
      phone: trainee.phone ?? '',
      email: trainee.email ?? '',
      medicalNotes: trainee.medicalNotes ?? '',
      emergencyNotes:
        trainee.emergencyNotes ?? '',
      status: trainee.status,
      isActive: trainee.isActive,
      branchId: trainee.branchId,
    });

    setError('');
    setNotice('');
    setModalOpen(true);
  }

  function closeModal(): void {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingTrainee(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const commonInput = {
        registrationCode:
          form.registrationCode.trim() || undefined,

        branchId:
          form.branchId ||
          context.branchId ||
          undefined,

        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,

        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,

        medicalNotes:
          form.medicalNotes.trim() || undefined,

        emergencyNotes:
          form.emergencyNotes.trim() || undefined,

        status: form.status,
        isActive: form.isActive,
      };

      if (editingTrainee) {
        const updateInput: UpdateTraineeInput = {
          ...commonInput,
        };

        await updateTrainee(
          editingTrainee.id,
          updateInput,
        );

        setNotice('تم تحديث بيانات المتدرب بنجاح');
      } else {
        if (!context.academyId) {
          throw new Error(
            'تعذر تحديد الأكاديمية الخاصة بالحساب',
          );
        }

        const branchId =
          commonInput.branchId ?? context.branchId;

        if (!branchId) {
          throw new Error(
            'تعذر تحديد الفرع الخاص بالحساب',
          );
        }

        const createInput: CreateTraineeInput = {
          academyId: context.academyId,
          branchId,
          registrationCode:
            commonInput.registrationCode,
          firstName: commonInput.firstName,
          lastName: commonInput.lastName,
          dateOfBirth: commonInput.dateOfBirth,
          gender: commonInput.gender,
          phone: commonInput.phone,
          email: commonInput.email,
          medicalNotes: commonInput.medicalNotes,
          emergencyNotes:
            commonInput.emergencyNotes,
          status: commonInput.status,
          isActive: commonInput.isActive,
        };

        await createTrainee(createInput);

        setNotice('تمت إضافة المتدرب بنجاح');
      }

      closeModal();
      await loadTrainees();
    } catch (saveError: unknown) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    trainee: Trainee,
  ): Promise<void> {
    const approved = window.confirm(
      `هل تريد حذف المتدرب ${trainee.firstName} ${trainee.lastName}؟`,
    );

    if (!approved) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await deleteTrainee(trainee.id);

      setNotice('تم حذف المتدرب بنجاح');

      await loadTrainees();
    } catch (deleteError: unknown) {
      setError(getApiErrorMessage(deleteError));
    }
  }

  return (
    <main className="trainees-page" dir="rtl">
      <header className="trainees-header">
        <div>
          <button
            type="button"
            className="trainees-back-button"
            onClick={onBack}
          >
            ← الرجوع إلى لوحة التحكم
          </button>

          <p className="trainees-eyebrow">
            إدارة الأكاديمية
          </p>

          <h1>إدارة المتدربين</h1>

          <p className="trainees-subtitle">
            عرض وإضافة وتحديث ملفات المتدربين
            ومتابعة حالتهم داخل الأكاديمية.
          </p>
        </div>

        <button
          type="button"
          className="trainees-primary-button"
          onClick={openCreateModal}
        >
          <span>＋</span>
          إضافة متدرب
        </button>
      </header>

      <section className="trainees-context">
        <div>
          <span>الأكاديمية</span>
          <strong>
            {context.academyName ?? 'الأكاديمية الحالية'}
          </strong>
        </div>

        <div>
          <span>الفرع</span>
          <strong>
            {context.branchName ?? 'الفرع الرئيسي'}
          </strong>
        </div>
      </section>

      <section className="trainees-stats">
        <article>
          <span>إجمالي المتدربين</span>
          <strong>{statistics.total}</strong>
        </article>

        <article>
          <span>المتدربون النشطون</span>
          <strong>{statistics.active}</strong>
        </article>

        <article>
          <span>متوقفون مؤقتًا</span>
          <strong>{statistics.paused}</strong>
        </article>

        <article>
          <span>غير نشطين</span>
          <strong>{statistics.inactive}</strong>
        </article>
      </section>

      {(error || notice) && (
        <section
          className={
            error
              ? 'trainees-message trainees-message-error'
              : 'trainees-message trainees-message-success'
          }
        >
          {error || notice}
        </section>
      )}

      <section className="trainees-toolbar">
        <label className="trainees-search">
          <span>⌕</span>

          <input
            type="search"
            value={search}
            placeholder="ابحث بالاسم أو الكود أو رقم الهاتف"
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
        </label>

        <select
          value={activeFilter}
          onChange={(event) => {
            setActiveFilter(
              event.target.value as
                | 'all'
                | 'active'
                | 'inactive',
            );
          }}
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط فقط</option>
          <option value="inactive">
            غير نشط فقط
          </option>
        </select>

        <button
          type="button"
          className="trainees-refresh-button"
          onClick={() => void loadTrainees()}
        >
          تحديث
        </button>
      </section>

      <section className="trainees-table-card">
        {loading ? (
          <div className="trainees-loading">
            <div className="trainees-spinner" />
            <p>جارٍ تحميل المتدربين...</p>
          </div>
        ) : trainees.length === 0 ? (
          <div className="trainees-empty">
            <div>👥</div>
            <h2>لا يوجد متدربون</h2>
            <p>
              أضف أول متدرب أو غيّر خيارات البحث.
            </p>

            <button
              type="button"
              className="trainees-primary-button"
              onClick={openCreateModal}
            >
              إضافة متدرب
            </button>
          </div>
        ) : (
          <div className="trainees-table-wrapper">
            <table className="trainees-table">
              <thead>
                <tr>
                  <th>المتدرب</th>
                  <th>كود التسجيل</th>
                  <th>العمر</th>
                  <th>الفرع</th>
                  <th>ولي الأمر</th>
                  <th>المجموعة</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {trainees.map((trainee) => (
                  <tr key={trainee.id}>
                    <td>
                      <div className="trainee-person">
                        <span className="trainee-avatar">
                          {trainee.firstName
                            .charAt(0)
                            .toUpperCase()}
                        </span>

                        <div>
                          <strong>
                            {trainee.firstName}{' '}
                            {trainee.lastName}
                          </strong>

                          <small>
                            {trainee.phone ??
                              trainee.email ??
                              'لا توجد بيانات اتصال'}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <code>
                        {trainee.registrationCode}
                      </code>
                    </td>

                    <td>
                      {calculateAge(
                        trainee.dateOfBirth,
                      )}
                    </td>

                    <td>
                      {trainee.branch?.name ??
                        'الفرع الحالي'}
                    </td>

                    <td>
                      {getPrimaryGuardian(trainee)}
                    </td>

                    <td>{getCurrentGroup(trainee)}</td>

                    <td>
                      <span
                        className={`trainee-status trainee-status-${trainee.status.toLowerCase()}`}
                      >
                        {getStatusLabel(
                          trainee.status,
                        )}
                      </span>
                    </td>

                    <td>
                      <div className="trainee-actions">
                        <button
                          type="button"
                          onClick={() => {
                            openEditModal(trainee);
                          }}
                        >
                          تعديل
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            void handleDelete(trainee);
                          }}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="trainees-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            className="trainees-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trainee-modal-title"
          >
            <header>
              <div>
                <p>ملف المتدرب</p>

                <h2 id="trainee-modal-title">
                  {editingTrainee
                    ? 'تعديل بيانات المتدرب'
                    : 'إضافة متدرب جديد'}
                </h2>
              </div>

              <button
                type="button"
                className="trainees-close-button"
                onClick={closeModal}
                aria-label="إغلاق"
              >
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="trainees-form-grid">
                <label>
                  الاسم الأول
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.firstName}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }));
                    }}
                  />
                </label>

                <label>
                  اسم العائلة
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.lastName}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }));
                    }}
                  />
                </label>

                <label>
                  تاريخ الميلاد
                  <input
                    required
                    type="date"
                    max={new Date()
                      .toISOString()
                      .slice(0, 10)}
                    value={form.dateOfBirth}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        dateOfBirth:
                          event.target.value,
                      }));
                    }}
                  />
                </label>

                <label>
                  النوع
                  <select
                    value={form.gender}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        gender: event.target
                          .value as TraineeGender,
                      }));
                    }}
                  >
                    <option value="MALE">ذكر</option>
                    <option value="FEMALE">أنثى</option>
                  </select>
                </label>

                <label>
                  رقم الهاتف
                  <input
                    type="tel"
                    maxLength={30}
                    value={form.phone}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }));
                    }}
                  />
                </label>

                <label>
                  البريد الإلكتروني
                  <input
                    type="email"
                    maxLength={180}
                    value={form.email}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }));
                    }}
                  />
                </label>

                <label>
                  كود التسجيل
                  <input
                    maxLength={60}
                    pattern="[A-Za-z0-9_-]+"
                    placeholder="يُنشأ تلقائيًا عند تركه فارغًا"
                    value={form.registrationCode}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        registrationCode:
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
                          .value as TraineeStatus,
                      }));
                    }}
                  >
                    <option value="ACTIVE">نشط</option>
                    <option value="PAUSED">
                      متوقف مؤقتًا
                    </option>
                    <option value="INACTIVE">
                      غير نشط
                    </option>
                  </select>
                </label>

                <label className="trainees-full-field">
                  ملاحظات طبية
                  <textarea
                    maxLength={2000}
                    rows={3}
                    value={form.medicalNotes}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        medicalNotes:
                          event.target.value,
                      }));
                    }}
                  />
                </label>

                <label className="trainees-full-field">
                  ملاحظات الطوارئ
                  <textarea
                    maxLength={2000}
                    rows={3}
                    value={form.emergencyNotes}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        emergencyNotes:
                          event.target.value,
                      }));
                    }}
                  />
                </label>

                <label className="trainees-checkbox-field">
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

                  الحساب فعال
                </label>
              </div>

              <footer>
                <button
                  type="button"
                  className="trainees-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="trainees-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'جارٍ الحفظ...'
                    : editingTrainee
                      ? 'حفظ التعديلات'
                      : 'إضافة المتدرب'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
