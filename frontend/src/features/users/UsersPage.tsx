import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { FormEvent } from 'react';

import {
  createUser,
  getUser,
  getUserReferenceData,
  getUsers,
  getUsersApiError,
} from '../../lib/users-api';

import type {
  AcademyRole,
  BranchOption,
  UserMembership,
  UserProfile,
  UserReferenceData,
} from '../../types/users';

import './UsersPage.css';

interface UsersPageProps {
  onBack: () => void;
}

interface UserFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
  role: AcademyRole;
  academyId: string;
  branchId: string;
}

const EMPTY_REFERENCE_DATA:
UserReferenceData = {
  currentUser: {
    id: '',
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: null,
    status: '',
    lastLoginAt: null,
    createdAt: '',
    memberships: [],
  },

  academies: [],
  branches: [],
};

const EMPTY_FORM: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirmation: '',
  role: 'COACH',
  academyId: '',
  branchId: '',
};

const ROLE_LABELS: Record<
  AcademyRole,
  string
> = {
  SUPER_ADMIN: 'سوبر أدمن',
  ACADEMY_ADMIN: 'مدير الأكاديمية',
  BRANCH_MANAGER: 'مدير الفرع',
  RECEPTIONIST: 'موظف استقبال',
  ACCOUNTANT: 'محاسب',
  COACH: 'مدرب',
  PARENT: 'ولي أمر',
  TRAINEE: 'متدرب',
};

const ALL_ROLES =
  Object.keys(ROLE_LABELS) as AcademyRole[];

const BRANCH_ROLES: AcademyRole[] = [
  'BRANCH_MANAGER',
  'RECEPTIONIST',
  'ACCOUNTANT',
  'COACH',
  'PARENT',
  'TRAINEE',
];

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return 'لم يسجل الدخول';
  }

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

function primaryMembership(
  user: UserProfile,
): UserMembership | undefined {
  return (
    user.memberships?.find(
      (membership) =>
        membership.isPrimary &&
        membership.isActive,
    ) ??
    user.memberships?.find(
      (membership) =>
        membership.isActive,
    ) ??
    user.memberships?.[0]
  );
}

function roleLabel(
  role?: AcademyRole,
): string {
  if (!role) {
    return 'بدون صلاحية';
  }

  return ROLE_LABELS[role] ?? role;
}

function statusLabel(
  status: string,
): string {
  switch (status) {
    case 'ACTIVE':
      return 'نشط';

    case 'INACTIVE':
      return 'غير نشط';

    case 'SUSPENDED':
      return 'موقوف';

    default:
      return status;
  }
}

export function UsersPage({
  onBack,
}: UsersPageProps) {
  const [users, setUsers] = useState<
    UserProfile[]
  >([]);

  const [
    referenceData,
    setReferenceData,
  ] = useState<UserReferenceData>(
    EMPTY_REFERENCE_DATA,
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [roleFilter, setRoleFilter] =
    useState('');

  const [branchFilter, setBranchFilter] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('');

  const [formOpen, setFormOpen] =
    useState(false);

  const [form, setForm] =
    useState<UserFormState>(EMPTY_FORM);

  const [detailsUser, setDetailsUser] =
    useState<UserProfile | null>(null);

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  async function loadData():
  Promise<void> {
    setLoading(true);
    setError('');

    try {
      const [references, loadedUsers] =
        await Promise.all([
          getUserReferenceData(),
          getUsers(),
        ]);

      setReferenceData(references);
      setUsers(loadedUsers);
    } catch (loadError: unknown) {
      setError(
        getUsersApiError(loadError),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const currentRole =
    referenceData.currentMembership?.role;

  const canCreate =
    currentRole === 'SUPER_ADMIN' ||
    currentRole === 'ACADEMY_ADMIN' ||
    currentRole === 'BRANCH_MANAGER';

  const allowedRoles =
    useMemo<AcademyRole[]>(() => {
      if (
        currentRole === 'SUPER_ADMIN'
      ) {
        return ALL_ROLES;
      }

      if (
        currentRole === 'ACADEMY_ADMIN'
      ) {
        return ALL_ROLES.filter(
          (role) =>
            role !== 'SUPER_ADMIN',
        );
      }

      if (
        currentRole === 'BRANCH_MANAGER'
      ) {
        return [
          'RECEPTIONIST',
          'ACCOUNTANT',
          'COACH',
          'PARENT',
          'TRAINEE',
        ];
      }

      return [];
    }, [currentRole]);

  const selectedAcademyBranches =
    useMemo<BranchOption[]>(() => {
      if (!form.academyId) {
        return [];
      }

      return referenceData.branches.filter(
        (branch) =>
          branch.academyId ===
            form.academyId &&
          branch.isActive !== false,
      );
    }, [
      form.academyId,
      referenceData.branches,
    ]);

  const visibleUsers = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return users.filter((user) => {
      const membership =
        primaryMembership(user);

      if (
        roleFilter &&
        membership?.role !== roleFilter
      ) {
        return false;
      }

      if (
        branchFilter &&
        membership?.branchId !==
          branchFilter
      ) {
        return false;
      }

      if (
        statusFilter &&
        user.status !== statusFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const values = [
        user.firstName,
        user.lastName,
        user.fullName,
        user.email,
        user.phone,
        membership?.academy?.name,
        membership?.branch?.name,
        membership?.role,
      ];

      return values.some((value) =>
        value
          ?.toLowerCase()
          .includes(query),
      );
    });
  }, [
    branchFilter,
    roleFilter,
    search,
    statusFilter,
    users,
  ]);

  const statistics = useMemo(() => {
    return {
      total: users.length,

      active: users.filter(
        (user) =>
          user.status === 'ACTIVE',
      ).length,

      coaches: users.filter(
        (user) =>
          primaryMembership(user)
            ?.role === 'COACH',
      ).length,

      administrators: users.filter(
        (user) =>
          [
            'SUPER_ADMIN',
            'ACADEMY_ADMIN',
            'BRANCH_MANAGER',
          ].includes(
            primaryMembership(user)
              ?.role ?? '',
          ),
      ).length,
    };
  }, [users]);

  function openCreateForm(): void {
    const membership =
      referenceData.currentMembership;

    const defaultAcademyId =
      membership?.academyId ??
      referenceData.academies.find(
        (academy) =>
          academy.isActive !== false,
      )?.id ??
      '';

    const defaultBranchId =
      membership?.branchId ??
      referenceData.branches.find(
        (branch) =>
          branch.academyId ===
          defaultAcademyId,
      )?.id ??
      '';

    const defaultRole =
      allowedRoles.includes('COACH')
        ? 'COACH'
        : allowedRoles[0] ??
          'TRAINEE';

    setForm({
      ...EMPTY_FORM,
      role: defaultRole,
      academyId: defaultAcademyId,
      branchId: defaultBranchId,
    });

    setFormOpen(true);
    setError('');
    setNotice('');
  }

  function changeRole(
    role: AcademyRole,
  ): void {
    setForm((current) => {
      if (role === 'SUPER_ADMIN') {
        return {
          ...current,
          role,
          academyId: '',
          branchId: '',
        };
      }

      return {
        ...current,
        role,

        academyId:
          current.academyId ||
          referenceData
            .currentMembership
            ?.academyId ||
          referenceData.academies[0]
            ?.id ||
          '',
      };
    });
  }

  async function submitUser(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (
        form.password !==
        form.passwordConfirmation
      ) {
        throw new Error(
          'تأكيد كلمة المرور غير مطابق',
        );
      }

      if (
        form.password.length < 8 ||
        form.password.length > 72
      ) {
        throw new Error(
          'كلمة المرور يجب أن تكون من 8 إلى 72 حرفًا',
        );
      }

      if (
        form.role !== 'SUPER_ADMIN' &&
        !form.academyId
      ) {
        throw new Error(
          'يجب اختيار الأكاديمية',
        );
      }

      if (
        BRANCH_ROLES.includes(
          form.role,
        ) &&
        !form.branchId
      ) {
        throw new Error(
          'يجب اختيار الفرع لهذا الدور',
        );
      }

      await createUser({
        firstName:
          form.firstName.trim(),

        lastName:
          form.lastName.trim(),

        email:
          form.email
            .trim()
            .toLowerCase(),

        phone:
          form.phone.trim() ||
          undefined,

        password: form.password,
        role: form.role,

        academyId:
          form.role === 'SUPER_ADMIN'
            ? undefined
            : form.academyId,

        branchId:
          form.role === 'SUPER_ADMIN'
            ? undefined
            : form.branchId ||
              undefined,
      });

      setFormOpen(false);
      setForm(EMPTY_FORM);

      setNotice(
        'تم إنشاء حساب المستخدم بنجاح',
      );

      await loadData();
    } catch (createError: unknown) {
      setError(
        getUsersApiError(
          createError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function openDetails(
    user: UserProfile,
  ): Promise<void> {
    setDetailsLoading(true);
    setError('');

    try {
      const profile = await getUser(
        user.id,
      );

      setDetailsUser(profile);
    } catch (detailError: unknown) {
      setError(
        getUsersApiError(
          detailError,
        ),
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <main
      className="users-page"
      dir="rtl"
    >
      <header className="users-header">
        <div>
          <button
            type="button"
            className="users-back-button"
            onClick={onBack}
          >
            ← الرجوع إلى لوحة التحكم
          </button>

          <p className="users-eyebrow">
            إدارة النظام
          </p>

          <h1>
            المستخدمون والصلاحيات
          </h1>

          <p className="users-description">
            إدارة المدربين والموظفين
            ومديري الفروع وحسابات
            الأكاديمية.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            className="users-primary-button"
            onClick={openCreateForm}
          >
            ＋ مستخدم جديد
          </button>
        )}
      </header>

      <section className="users-context">
        <div>
          <span>الحساب الحالي</span>

          <strong>
            {referenceData.currentUser
              .fullName ||
              referenceData.currentUser
                .email}
          </strong>
        </div>

        <div>
          <span>صلاحيتك</span>

          <strong>
            {roleLabel(currentRole)}
          </strong>
        </div>

        <div>
          <span>الأكاديمية</span>

          <strong>
            {referenceData
              .currentMembership
              ?.academy?.name ??
              'إدارة المنصة'}
          </strong>
        </div>
      </section>

      <section className="users-statistics">
        <article>
          <span>إجمالي المستخدمين</span>
          <strong>
            {statistics.total}
          </strong>
        </article>

        <article>
          <span>الحسابات النشطة</span>
          <strong>
            {statistics.active}
          </strong>
        </article>

        <article>
          <span>المدربون</span>
          <strong>
            {statistics.coaches}
          </strong>
        </article>

        <article>
          <span>الإدارة</span>
          <strong>
            {statistics.administrators}
          </strong>
        </article>
      </section>

      {(error || notice) && (
        <div
          className={
            error
              ? 'users-message users-error'
              : 'users-message users-success'
          }
        >
          {error || notice}
        </div>
      )}

      <section className="users-toolbar">
        <input
          type="search"
          value={search}
          placeholder="ابحث بالاسم أو البريد أو الهاتف"
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <select
          value={roleFilter}
          onChange={(event) =>
            setRoleFilter(
              event.target.value,
            )
          }
        >
          <option value="">
            كل الصلاحيات
          </option>

          {ALL_ROLES.map((role) => (
            <option
              key={role}
              value={role}
            >
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>

        <select
          value={branchFilter}
          onChange={(event) =>
            setBranchFilter(
              event.target.value,
            )
          }
        >
          <option value="">
            كل الفروع
          </option>

          {referenceData.branches.map(
            (branch) => (
              <option
                key={branch.id}
                value={branch.id}
              >
                {branch.name}
              </option>
            ),
          )}
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value,
            )
          }
        >
          <option value="">
            كل الحالات
          </option>

          <option value="ACTIVE">
            نشط
          </option>

          <option value="INACTIVE">
            غير نشط
          </option>

          <option value="SUSPENDED">
            موقوف
          </option>
        </select>

        <button
          type="button"
          onClick={() =>
            void loadData()
          }
        >
          تحديث
        </button>
      </section>

      <section className="users-content">
        {loading ? (
          <div className="users-empty-state">
            جارٍ تحميل المستخدمين...
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="users-empty-state">
            <div>👤</div>

            <h2>
              لا يوجد مستخدمون
            </h2>

            <p>
              أضف أول مدرب أو موظف
              للأكاديمية.
            </p>

            {canCreate && (
              <button
                type="button"
                className="users-primary-button"
                onClick={openCreateForm}
              >
                إنشاء مستخدم
              </button>
            )}
          </div>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الصلاحية</th>
                  <th>الأكاديمية</th>
                  <th>الفرع</th>
                  <th>الحالة</th>
                  <th>آخر دخول</th>
                  <th>الإجراء</th>
                </tr>
              </thead>

              <tbody>
                {visibleUsers.map(
                  (user) => {
                    const membership =
                      primaryMembership(
                        user,
                      );

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="user-person">
                            <span>
                              {user.firstName
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <div>
                              <strong>
                                {user.fullName ||
                                  `${user.firstName} ${user.lastName}`}
                              </strong>

                              <small>
                                {user.email}
                              </small>

                              {user.phone && (
                                <small>
                                  {user.phone}
                                </small>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`user-role user-role-${membership?.role?.toLowerCase() ?? 'none'}`}
                          >
                            {roleLabel(
                              membership?.role,
                            )}
                          </span>
                        </td>

                        <td>
                          {membership?.academy
                            ?.name ??
                            'إدارة المنصة'}
                        </td>

                        <td>
                          {membership?.branch
                            ?.name ??
                            'كل الفروع'}
                        </td>

                        <td>
                          <span
                            className={`user-status user-status-${user.status.toLowerCase()}`}
                          >
                            {statusLabel(
                              user.status,
                            )}
                          </span>
                        </td>

                        <td>
                          {formatDateTime(
                            user.lastLoginAt,
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="users-details-button"
                            disabled={
                              detailsLoading
                            }
                            onClick={() =>
                              void openDetails(
                                user,
                              )
                            }
                          >
                            عرض التفاصيل
                          </button>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && (
        <div
          className="users-overlay"
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
          <section className="users-modal">
            <header>
              <div>
                <p>حساب جديد</p>

                <h2>
                  إضافة مستخدم
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

            <form onSubmit={submitUser}>
              <div className="users-form-grid">
                <label>
                  الاسم الأول
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.firstName}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          firstName:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  اسم العائلة
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.lastName}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          lastName:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  البريد الإلكتروني
                  <input
                    required
                    type="email"
                    maxLength={180}
                    value={form.email}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          email:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  رقم الهاتف
                  <input
                    type="tel"
                    maxLength={30}
                    value={form.phone}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          phone:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  الصلاحية
                  <select
                    required
                    value={form.role}
                    onChange={(event) =>
                      changeRole(
                        event.target
                          .value as AcademyRole,
                      )
                    }
                  >
                    {allowedRoles.map(
                      (role) => (
                        <option
                          key={role}
                          value={role}
                        >
                          {
                            ROLE_LABELS[
                              role
                            ]
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                {form.role !==
                  'SUPER_ADMIN' && (
                  <label>
                    الأكاديمية
                    <select
                      required
                      disabled={
                        currentRole !==
                        'SUPER_ADMIN'
                      }
                      value={
                        form.academyId
                      }
                      onChange={(
                        event,
                      ) => {
                        const academyId =
                          event.target
                            .value;

                        const firstBranch =
                          referenceData.branches.find(
                            (branch) =>
                              branch.academyId ===
                              academyId,
                          );

                        setForm(
                          (current) => ({
                            ...current,
                            academyId,
                            branchId:
                              firstBranch
                                ?.id ??
                              '',
                          }),
                        );
                      }}
                    >
                      <option value="">
                        اختر الأكاديمية
                      </option>

                      {referenceData.academies.map(
                        (academy) => (
                          <option
                            key={
                              academy.id
                            }
                            value={
                              academy.id
                            }
                          >
                            {
                              academy.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                )}

                {form.role !==
                  'SUPER_ADMIN' && (
                  <label>
                    الفرع
                    <select
                      required={BRANCH_ROLES.includes(
                        form.role,
                      )}
                      disabled={
                        currentRole ===
                          'BRANCH_MANAGER' ||
                        !form.academyId
                      }
                      value={
                        form.branchId
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            branchId:
                              event.target
                                .value,
                          }),
                        )
                      }
                    >
                      <option value="">
                        كل الفروع
                      </option>

                      {selectedAcademyBranches.map(
                        (branch) => (
                          <option
                            key={
                              branch.id
                            }
                            value={
                              branch.id
                            }
                          >
                            {
                              branch.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                )}

                <label>
                  كلمة المرور
                  <input
                    required
                    type="password"
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          password:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  تأكيد كلمة المرور
                  <input
                    required
                    type="password"
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    value={
                      form.passwordConfirmation
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          passwordConfirmation:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>
              </div>

              <footer>
                <button
                  type="button"
                  className="users-secondary-button"
                  disabled={saving}
                  onClick={() =>
                    setFormOpen(false)
                  }
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="users-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'جارٍ إنشاء الحساب...'
                    : 'إنشاء الحساب'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {detailsUser && (
        <div
          className="users-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setDetailsUser(null);
            }
          }}
        >
          <section className="users-modal users-details-modal">
            <header>
              <div>
                <p>ملف المستخدم</p>

                <h2>
                  {detailsUser.fullName}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetailsUser(null)
                }
              >
                ×
              </button>
            </header>

            <div className="users-profile-header">
              <span>
                {detailsUser.firstName
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <div>
                <h3>
                  {detailsUser.fullName}
                </h3>

                <p>
                  {detailsUser.email}
                </p>

                <p>
                  {detailsUser.phone ??
                    'لا يوجد رقم هاتف'}
                </p>
              </div>
            </div>

            <div className="users-profile-statistics">
              <article>
                <span>الحالة</span>
                <strong>
                  {statusLabel(
                    detailsUser.status,
                  )}
                </strong>
              </article>

              <article>
                <span>آخر دخول</span>
                <strong>
                  {formatDateTime(
                    detailsUser.lastLoginAt,
                  )}
                </strong>
              </article>

              <article>
                <span>تاريخ الإنشاء</span>
                <strong>
                  {formatDateTime(
                    detailsUser.createdAt,
                  )}
                </strong>
              </article>
            </div>

            <section className="users-memberships">
              <h3>
                الصلاحيات والأكاديميات
              </h3>

              {detailsUser.memberships.map(
                (membership) => (
                  <article
                    key={membership.id}
                  >
                    <div>
                      <strong>
                        {roleLabel(
                          membership.role,
                        )}
                      </strong>

                      <span>
                        {membership.academy
                          ?.name ??
                          'إدارة المنصة'}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {membership.branch
                          ?.name ??
                          'كل الفروع'}
                      </strong>

                      <span>
                        {membership.isActive
                          ? 'صلاحية نشطة'
                          : 'صلاحية متوقفة'}
                      </span>
                    </div>

                    {membership.isPrimary && (
                      <span className="membership-primary">
                        أساسية
                      </span>
                    )}
                  </article>
                ),
              )}
            </section>

            <footer className="users-details-footer">
              <button
                type="button"
                className="users-secondary-button"
                onClick={() =>
                  setDetailsUser(null)
                }
              >
                إغلاق
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
