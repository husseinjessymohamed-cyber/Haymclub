import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  createPortalLink,
  createTraineePortalLink,
  deletePortalLink,
  getPortalAdminData,
  getPortalApiError,
  updatePortalLink,
} from '../../lib/portal-api';

import type {
  PortalRelationship,
  TraineePortalCredentials,
} from '../../types/portal';

import type {
  Trainee,
} from '../../types/trainees';

import type {
  AcademyRole,
  UserMembership,
  UserProfile,
} from '../../types/users';

import './PortalLinksPage.css';

interface PortalLinksPageProps {
  onBack: () => void;
}

interface PortalLinkForm {
  userId: string;
  traineeId: string;
  relationship: PortalRelationship;
  isPrimary: boolean;
  isActive: boolean;
}

const EMPTY_FORM: PortalLinkForm = {
  userId: '',
  traineeId: '',
  relationship: 'PARENT',
  isPrimary: true,
  isActive: true,
};

const RELATIONSHIP_LABELS:
Record<PortalRelationship, string> = {
  SELF: 'المتدرب نفسه',
  PARENT: 'ولي أمر',
  GUARDIAN: 'وصي',
};

const ROLE_LABELS:
Partial<Record<AcademyRole, string>> = {
  PARENT: 'ولي أمر',
  TRAINEE: 'متدرب',
};

function userMembership(
  user?: UserProfile,
): UserMembership | undefined {
  const memberships =
    user?.memberships ?? [];

  return (
    memberships.find(
      (membership) =>
        membership.isPrimary &&
        membership.isActive,
    ) ??
    memberships.find(
      (membership) =>
        membership.isActive,
    )
  );
}

function userName(
  user?: UserProfile,
): string {
  if (!user) {
    return 'مستخدم غير متاح';
  }

  return (
    user.fullName ||
    `${user.firstName} ${user.lastName}`.trim()
  );
}

function traineeName(
  trainee?: Trainee,
): string {
  if (!trainee) {
    return 'متدرب غير متاح';
  }

  return `${trainee.firstName} ${trainee.lastName}`.trim();
}

export function PortalLinksPage({
  onBack,
}: PortalLinksPageProps) {
  const query = useQuery({
    queryKey: [
      'portal-admin-data',
    ],

    queryFn:
      getPortalAdminData,

    staleTime:
      20_000,
  });

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    formOpen,
    setFormOpen,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM,
  );

  const [
    selectedTraineeId,
    setSelectedTraineeId,
  ] = useState('');

  const [
    credentials,
    setCredentials,
  ] =
    useState<TraineePortalCredentials | null>(
      null,
    );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    notice,
    setNotice,
  ] = useState('');

  const data =
    query.data;

  const selectedUser =
    data?.users.find(
      (user) =>
        user.id ===
        form.userId,
    );

  const selectedMembership =
    userMembership(
      selectedUser,
    );

  const selectedUserRole =
    selectedMembership?.role;

  const selfLinkedTraineeIds =
    useMemo(() => {
      const ids =
        new Set<string>();

      for (
        const link of
        data?.links ?? []
      ) {
        const membership =
          userMembership(
            link.user,
          );

        if (
          link.relationship ===
            'SELF' &&
          membership?.role ===
            'TRAINEE'
        ) {
          ids.add(
            link.traineeId,
          );
        }
      }

      return ids;
    }, [
      data,
    ]);

  const unlinkedTrainees =
    useMemo(() => {
      return (
        data?.trainees.filter(
          (trainee) =>
            trainee.isActive !==
              false &&
            !selfLinkedTraineeIds.has(
              trainee.id,
            ),
        ) ?? []
      );
    }, [
      data,
      selfLinkedTraineeIds,
    ]);

  useEffect(() => {
    const selectionStillExists =
      unlinkedTrainees.some(
        (trainee) =>
          trainee.id ===
          selectedTraineeId,
      );

    if (
      !selectionStillExists
    ) {
      setSelectedTraineeId(
        unlinkedTrainees[0]
          ?.id ?? '',
      );
    }
  }, [
    selectedTraineeId,
    unlinkedTrainees,
  ]);

  const availableTrainees =
    useMemo(() => {
      if (!data) {
        return [];
      }

      if (
        !selectedMembership
      ) {
        return data.trainees;
      }

      return data.trainees.filter(
        (trainee) => {
          if (
            selectedMembership
              .academyId &&
            trainee.academyId !==
              selectedMembership
                .academyId
          ) {
            return false;
          }

          if (
            selectedMembership
              .branchId &&
            trainee.branchId !==
              selectedMembership
                .branchId
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      data,
      selectedMembership,
    ]);

  const visibleLinks =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!data) {
        return [];
      }

      if (!value) {
        return data.links;
      }

      return data.links.filter(
        (link) => {
          const searchable = [
            userName(
              link.user,
            ),

            link.user?.email,

            link.user?.phone,

            traineeName(
              link.trainee,
            ),

            link.trainee
              ?.registrationCode,

            link.trainee
              ?.branch?.name,

            link.relationship,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return searchable.includes(
            value,
          );
        },
      );
    }, [
      data,
      search,
    ]);

  function openCreateForm():
  void {
    const firstUser =
      data?.users[0];

    const membership =
      userMembership(
        firstUser,
      );

    const role =
      membership?.role;

    const relationship:
    PortalRelationship =
      role === 'TRAINEE'
        ? 'SELF'
        : 'PARENT';

    const firstTrainee =
      data?.trainees.find(
        (trainee) =>
          !membership
            ?.academyId ||
          trainee.academyId ===
            membership.academyId,
      );

    setForm({
      userId:
        firstUser?.id ?? '',

      traineeId:
        firstTrainee?.id ?? '',

      relationship,

      isPrimary:
        true,

      isActive:
        true,
    });

    setFormOpen(true);
    setError('');
    setNotice('');
  }

  function handleUserChange(
    userId: string,
  ): void {
    const user =
      data?.users.find(
        (item) =>
          item.id === userId,
      );

    const membership =
      userMembership(user);

    const role =
      membership?.role;

    const relationship:
    PortalRelationship =
      role === 'TRAINEE'
        ? 'SELF'
        : 'PARENT';

    const trainee =
      data?.trainees.find(
        (item) =>
          (
            !membership
              ?.academyId ||
            item.academyId ===
              membership.academyId
          ) &&
          (
            !membership
              ?.branchId ||
            item.branchId ===
              membership.branchId
          ),
      );

    setForm(
      (current) => ({
        ...current,
        userId,
        relationship,

        traineeId:
          trainee?.id ?? '',
      }),
    );
  }

  async function createSelectedTraineeLink():
  Promise<void> {
    if (
      !selectedTraineeId
    ) {
      setError(
        'اختر المتدرب أولًا',
      );

      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    setCredentials(null);

    try {
      const result =
        await createTraineePortalLink(
          selectedTraineeId,
        );

      setCredentials(
        result.credentials,
      );

      setNotice(
        'تم إنشاء حساب المتدرب وربطه بالبوابة بنجاح',
      );

      await query.refetch();
    } catch (
      createError: unknown
    ) {
      setError(
        getPortalApiError(
          createError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitForm(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (
      !form.userId ||
      !form.traineeId
    ) {
      setError(
        'يجب اختيار الحساب والمتدرب',
      );

      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await createPortalLink({
        userId:
          form.userId,

        traineeId:
          form.traineeId,

        relationship:
          form.relationship,

        isPrimary:
          form.isPrimary,

        isActive:
          form.isActive,
      });

      setFormOpen(false);

      setNotice(
        'تم ربط الحساب بالمتدرب بنجاح',
      );

      await query.refetch();
    } catch (
      submitError: unknown
    ) {
      setError(
        getPortalApiError(
          submitError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(
    id: string,
    isActive: boolean,
  ): Promise<void> {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      await updatePortalLink(
        id,
        {
          isActive:
            !isActive,
        },
      );

      setNotice(
        isActive
          ? 'تم إيقاف الرابط'
          : 'تم تفعيل الرابط',
      );

      await query.refetch();
    } catch (
      updateError: unknown
    ) {
      setError(
        getPortalApiError(
          updateError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function makePrimary(
    id: string,
  ): Promise<void> {
    setSaving(true);
    setError('');

    try {
      await updatePortalLink(
        id,
        {
          isPrimary:
            true,
        },
      );

      setNotice(
        'تم تعيين المتدرب كرابط أساسي',
      );

      await query.refetch();
    } catch (
      updateError: unknown
    ) {
      setError(
        getPortalApiError(
          updateError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeLink(
    id: string,
    name: string,
  ): Promise<void> {
    const approved =
      window.confirm(
        `هل تريد حذف ربط "${name}"؟`,
      );

    if (!approved) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await deletePortalLink(
        id,
      );

      setNotice(
        'تم حذف الرابط',
      );

      await query.refetch();
    } catch (
      deleteError: unknown
    ) {
      setError(
        getPortalApiError(
          deleteError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyValue(
    value: string,
  ): Promise<void> {
    try {
      await navigator.clipboard
        .writeText(value);

      setNotice(
        'تم نسخ البيانات',
      );
    } catch {
      setError(
        'تعذر النسخ تلقائيًا',
      );
    }
  }

  if (query.isPending) {
    return (
      <main className="portal-admin-state">
        <div className="portal-admin-loader" />

        <h1>
          جارٍ تحميل بوابة العملاء
        </h1>
      </main>
    );
  }

  if (
    query.isError ||
    !data
  ) {
    return (
      <main className="portal-admin-state">
        <h1>
          تعذر تحميل روابط البوابة
        </h1>

        <p>
          {getPortalApiError(
            query.error,
          )}
        </p>

        <button
          type="button"
          onClick={() =>
            void query.refetch()
          }
        >
          إعادة المحاولة
        </button>
      </main>
    );
  }

  return (
    <main
      className="portal-links-page"
      dir="rtl"
    >
      <header className="portal-links-header">
        <div>
          <button
            type="button"
            className="portal-links-back"
            onClick={onBack}
          >
            ← الرجوع إلى لوحة التحكم
          </button>

          <p className="portal-links-eyebrow">
            بوابة العملاء
          </p>

          <h1>
            ربط أولياء الأمور والمتدربين
          </h1>

          <p>
            اختر المتدرب ثم أنشئ حساب
            البوابة والرابط بضغطة واحدة.
          </p>
        </div>

        <div className="portal-header-actions">
          <button
            type="button"
            className="portal-links-secondary"
            onClick={openCreateForm}
            disabled={saving}
          >
            ربط ولي أمر موجود
          </button>

          <button
            type="button"
            className="portal-links-primary"
            disabled={
              saving ||
              !selectedTraineeId
            }
            onClick={() =>
              void createSelectedTraineeLink()
            }
          >
            ＋ إنشاء رابط جديد
          </button>
        </div>
      </header>

      <section className="portal-trainee-create">
        <div>
          <strong>
            المتدربون بدون حساب بوابة
          </strong>

          <span>
            أي متدرب جديد سيظهر تلقائيًا
            في هذه القائمة.
          </span>
        </div>

        <select
          value={
            selectedTraineeId
          }
          disabled={
            saving ||
            unlinkedTrainees.length ===
              0
          }
          onChange={(event) =>
            setSelectedTraineeId(
              event.target.value,
            )
          }
        >
          <option value="">
            اختر المتدرب
          </option>

          {unlinkedTrainees.map(
            (trainee) => (
              <option
                key={trainee.id}
                value={trainee.id}
              >
                {traineeName(
                  trainee,
                )}
                {' — '}
                {trainee.registrationCode}
                {' — '}
                {trainee.branch?.name ??
                  'الفرع الرئيسي'}
              </option>
            ),
          )}
        </select>

        <button
          type="button"
          className="portal-links-primary"
          disabled={
            saving ||
            !selectedTraineeId
          }
          onClick={() =>
            void createSelectedTraineeLink()
          }
        >
          {saving
            ? 'جارٍ الإنشاء...'
            : 'إنشاء رابط المتدرب'}
        </button>

        {unlinkedTrainees.length ===
          0 && (
          <p className="portal-all-linked">
            جميع المتدربين لديهم حسابات
            بوابة.
          </p>
        )}
      </section>

      {credentials && (
        <section className="portal-credentials">
          <div>
            <strong>
              بيانات دخول المتدرب
            </strong>

            <span>
              احفظها الآن؛ كلمة المرور
              تظهر بعد الإنشاء فقط.
            </span>
          </div>

          <label>
            البريد الإلكتروني

            <div>
              <input
                readOnly
                value={
                  credentials.email
                }
              />

              <button
                type="button"
                onClick={() =>
                  void copyValue(
                    credentials.email,
                  )
                }
              >
                نسخ
              </button>
            </div>
          </label>

          <label>
            كلمة المرور المؤقتة

            <div>
              <input
                readOnly
                value={
                  credentials.password
                }
              />

              <button
                type="button"
                onClick={() =>
                  void copyValue(
                    credentials.password,
                  )
                }
              >
                نسخ
              </button>
            </div>
          </label>
        </section>
      )}

      <section className="portal-links-stats">
        <article>
          <span>
            إجمالي الروابط
          </span>

          <strong>
            {data.links.length}
          </strong>
        </article>

        <article>
          <span>
            الروابط النشطة
          </span>

          <strong>
            {data.links.filter(
              (link) =>
                link.isActive,
            ).length}
          </strong>
        </article>

        <article>
          <span>
            حسابات أولياء الأمور
          </span>

          <strong>
            {data.users.filter(
              (user) =>
                userMembership(
                  user,
                )?.role ===
                'PARENT',
            ).length}
          </strong>
        </article>

        <article>
          <span>
            متدربون بدون رابط
          </span>

          <strong>
            {unlinkedTrainees.length}
          </strong>
        </article>
      </section>

      {(error || notice) && (
        <section
          className={
            error
              ? 'portal-links-message portal-links-error'
              : 'portal-links-message portal-links-success'
          }
        >
          {error || notice}
        </section>
      )}

      <section className="portal-links-toolbar">
        <input
          type="search"
          value={search}
          placeholder="ابحث باسم الحساب أو المتدرب أو الكود"
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
        />

        <button
          type="button"
          onClick={() =>
            void query.refetch()
          }
        >
          {query.isFetching
            ? 'جارٍ التحديث...'
            : '↻ تحديث'}
        </button>
      </section>

      {visibleLinks.length === 0 ? (
        <section className="portal-links-empty">
          <div>👨‍👩‍👧</div>

          <h2>
            لا توجد روابط
          </h2>

          <p>
            اختر متدربًا من القائمة
            واضغط إنشاء رابط جديد.
          </p>
        </section>
      ) : (
        <section className="portal-links-table-wrapper">
          <table className="portal-links-table">
            <thead>
              <tr>
                <th>الحساب</th>
                <th>نوع الحساب</th>
                <th>المتدرب</th>
                <th>الفرع</th>
                <th>العلاقة</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {visibleLinks.map(
                (link) => {
                  const membership =
                    userMembership(
                      link.user,
                    );

                  return (
                    <tr key={link.id}>
                      <td>
                        <strong>
                          {userName(
                            link.user,
                          )}
                        </strong>

                        <small>
                          {link.user
                            ?.email ??
                            '—'}
                        </small>
                      </td>

                      <td>
                        <span className="portal-role-badge">
                          {ROLE_LABELS[
                            membership
                              ?.role ??
                              'PARENT'
                          ] ??
                            membership
                              ?.role}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {traineeName(
                            link.trainee,
                          )}
                        </strong>

                        <small>
                          {link.trainee
                            ?.registrationCode ??
                            '—'}
                        </small>
                      </td>

                      <td>
                        {link.trainee
                          ?.branch
                          ?.name ??
                          '—'}
                      </td>

                      <td>
                        {
                          RELATIONSHIP_LABELS[
                            link.relationship
                          ]
                        }

                        {link.isPrimary && (
                          <span className="portal-primary-badge">
                            أساسي
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            link.isActive
                              ? 'portal-status-active'
                              : 'portal-status-inactive'
                          }
                        >
                          {link.isActive
                            ? 'نشط'
                            : 'متوقف'}
                        </span>
                      </td>

                      <td>
                        <div className="portal-link-actions">
                          {!link.isPrimary && (
                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                void makePrimary(
                                  link.id,
                                )
                              }
                            >
                              تعيين أساسي
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void toggleActive(
                                link.id,
                                link.isActive,
                              )
                            }
                          >
                            {link.isActive
                              ? 'إيقاف'
                              : 'تفعيل'}
                          </button>

                          <button
                            type="button"
                            className="danger"
                            disabled={saving}
                            onClick={() =>
                              void removeLink(
                                link.id,
                                traineeName(
                                  link.trainee,
                                ),
                              )
                            }
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </section>
      )}

      {formOpen && (
        <div
          className="portal-links-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              setFormOpen(false);
            }
          }}
        >
          <section
            className="portal-links-modal"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <p>
                  بوابة العملاء
                </p>

                <h2>
                  ربط حساب موجود بمتدرب
                </h2>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setFormOpen(false)
                }
              >
                ×
              </button>
            </header>

            <form
              onSubmit={
                submitForm
              }
            >
              <label>
                حساب المستخدم

                <select
                  required
                  value={
                    form.userId
                  }
                  onChange={(event) =>
                    handleUserChange(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    اختر الحساب
                  </option>

                  {data.users.map(
                    (user) => {
                      const membership =
                        userMembership(
                          user,
                        );

                      return (
                        <option
                          key={user.id}
                          value={user.id}
                        >
                          {userName(user)}
                          {' — '}
                          {ROLE_LABELS[
                            membership
                              ?.role ??
                              'PARENT'
                          ]}
                        </option>
                      );
                    },
                  )}
                </select>
              </label>

              <label>
                المتدرب

                <select
                  required
                  value={
                    form.traineeId
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,

                        traineeId:
                          event.target
                            .value,
                      }),
                    )
                  }
                >
                  <option value="">
                    اختر المتدرب
                  </option>

                  {availableTrainees.map(
                    (trainee) => (
                      <option
                        key={trainee.id}
                        value={trainee.id}
                      >
                        {traineeName(
                          trainee,
                        )}
                        {' — '}
                        {
                          trainee.registrationCode
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                العلاقة

                <select
                  value={
                    form.relationship
                  }
                  disabled={
                    selectedUserRole ===
                    'TRAINEE'
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,

                        relationship:
                          event.target
                            .value as PortalRelationship,
                      }),
                    )
                  }
                >
                  {selectedUserRole ===
                  'TRAINEE' ? (
                    <option value="SELF">
                      المتدرب نفسه
                    </option>
                  ) : (
                    <>
                      <option value="PARENT">
                        ولي أمر
                      </option>

                      <option value="GUARDIAN">
                        وصي
                      </option>
                    </>
                  )}
                </select>
              </label>

              <label className="portal-checkbox">
                <input
                  type="checkbox"
                  checked={
                    form.isPrimary
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,

                        isPrimary:
                          event.target
                            .checked,
                      }),
                    )
                  }
                />

                الرابط الأساسي لهذا الحساب
              </label>

              <label className="portal-checkbox">
                <input
                  type="checkbox"
                  checked={
                    form.isActive
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,

                        isActive:
                          event.target
                            .checked,
                      }),
                    )
                  }
                />

                تفعيل الرابط
              </label>

              <footer>
                <button
                  type="button"
                  className="portal-links-secondary"
                  disabled={saving}
                  onClick={() =>
                    setFormOpen(false)
                  }
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="portal-links-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'جارٍ الحفظ...'
                    : 'إنشاء الرابط'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
