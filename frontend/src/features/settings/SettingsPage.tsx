import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import {
  createAcademy,
  createBranch,
  createProgram,
  createSport,
  deleteAcademy,
  deleteBranch,
  deleteProgram,
  deleteSport,
  getSettingsApiError,
  getSettingsBootstrap,
  updateAcademy,
  updateBranch,
  updateProgram,
  updateSport,
} from '../../lib/settings-api';

import type {
  Academy,
  AcademyStatus,
  Branch,
  SettingsBootstrap,
  Sport,
  TrainingLevel,
  TrainingProgram,
} from '../../types/settings';

import './SettingsPage.css';

interface SettingsPageProps {
  onBack: () => void;
}

type SettingsTab =
  | 'academies'
  | 'branches'
  | 'sports'
  | 'programs';

type FormKind =
  | 'academy'
  | 'branch'
  | 'sport'
  | 'program';

type FormValue =
  | string
  | boolean
  | number;

type FormState =
  Record<string, FormValue>;

const EMPTY_BOOTSTRAP: SettingsBootstrap = {
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
  sports: [],
  programs: [],
};

const ACADEMY_STATUS_LABELS:
Record<AcademyStatus, string> = {
  TRIAL: 'فترة تجريبية',
  ACTIVE: 'نشطة',
  SUSPENDED: 'موقوفة',
};

const LEVEL_LABELS:
Record<TrainingLevel, string> = {
  ALL_LEVELS: 'كل المستويات',
  BEGINNER: 'مبتدئ',
  INTERMEDIATE: 'متوسط',
  ADVANCED: 'متقدم',
  PROFESSIONAL: 'احترافي',
};

function valueString(
  form: FormState,
  key: string,
): string {
  return String(form[key] ?? '');
}

function valueBoolean(
  form: FormState,
  key: string,
): boolean {
  return Boolean(form[key]);
}

function optionalString(
  value: FormValue | undefined,
): string | undefined {
  const result =
    String(value ?? '').trim();

  return result || undefined;
}

function optionalNumber(
  value: FormValue | undefined,
): number | undefined {
  const text =
    String(value ?? '').trim();

  if (!text) {
    return undefined;
  }

  const parsed = Number(text);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      'يوجد حقل رقمي غير صحيح',
    );
  }

  return parsed;
}

function requiredInteger(
  value: FormValue | undefined,
  fieldName: string,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw new Error(
      `${fieldName} يجب أن يكون من ${minimum} إلى ${maximum}`,
    );
  }

  return parsed;
}

function validateAgeRange(
  minimumAge?: number,
  maximumAge?: number,
): void {
  if (
    minimumAge !== undefined &&
    maximumAge !== undefined &&
    minimumAge > maximumAge
  ) {
    throw new Error(
      'الحد الأدنى للعمر لا يمكن أن يكون أكبر من الحد الأقصى',
    );
  }
}

export function SettingsPage({
  onBack,
}: SettingsPageProps) {
  const [data, setData] =
    useState<SettingsBootstrap>(
      EMPTY_BOOTSTRAP,
    );

  const [tab, setTab] =
    useState<SettingsTab>(
      'academies',
    );

  const [
    selectedAcademyId,
    setSelectedAcademyId,
  ] = useState('');

  const [search, setSearch] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [notice, setNotice] =
    useState('');

  const [formKind, setFormKind] =
    useState<FormKind | null>(null);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<FormState>({});

  async function loadData(
    preferredAcademyId?: string,
  ): Promise<void> {
    setLoading(true);
    setError('');

    try {
      const result =
        await getSettingsBootstrap();

      const resolvedAcademyId =
        preferredAcademyId &&
        result.academies.some(
          (academy) =>
            academy.id ===
            preferredAcademyId,
        )
          ? preferredAcademyId
          : result.currentMembership
              ?.academyId ??
            result.academies[0]?.id ??
            '';

      setData(result);
      setSelectedAcademyId(
        resolvedAcademyId,
      );
    } catch (loadError: unknown) {
      setError(
        getSettingsApiError(loadError),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const currentRole =
    data.currentRole;

  const isSuperAdmin =
    currentRole === 'SUPER_ADMIN';

  const isAcademyAdmin =
    currentRole === 'ACADEMY_ADMIN';

  const isBranchManager =
    currentRole === 'BRANCH_MANAGER';

  const canCreateAcademy =
    isSuperAdmin;

  const canEditAcademy =
    isSuperAdmin ||
    isAcademyAdmin;

  const canManageCatalog =
    isSuperAdmin ||
    isAcademyAdmin;


const selectedAcademy =
    useMemo(
      () =>
        data.academies.find(
          (academy) =>
            academy.id ===
            selectedAcademyId,
        ),
      [
        data.academies,
        selectedAcademyId,
      ],
    );

  const visibleBranches =
    useMemo(
      () =>
        data.branches.filter(
          (branch) =>
            !selectedAcademyId ||
            branch.academyId ===
              selectedAcademyId,
        ),
      [
        data.branches,
        selectedAcademyId,
      ],
    );

  const visibleSports =
    useMemo(
      () =>
        data.sports.filter(
          (sport) =>
            !selectedAcademyId ||
            sport.academyId ===
              selectedAcademyId,
        ),
      [
        data.sports,
        selectedAcademyId,
      ],
    );

  const visiblePrograms =
    useMemo(
      () =>
        data.programs.filter(
          (program) =>
            !selectedAcademyId ||
            program.academyId ===
              selectedAcademyId,
        ),
      [
        data.programs,
        selectedAcademyId,
      ],
    );

  const query =
    search.trim().toLowerCase();

  const filteredAcademies =
    useMemo(
      () =>
        data.academies.filter(
          (academy) =>
            !query ||
            [
              academy.name,
              academy.slug,
              academy.legalName,
              academy.email,
              academy.phone,
            ].some((value) =>
              value
                ?.toLowerCase()
                .includes(query),
            ),
        ),
      [
        data.academies,
        query,
      ],
    );

  const filteredBranches =
    useMemo(
      () =>
        visibleBranches.filter(
          (branch) =>
            !query ||
            [
              branch.name,
              branch.code,
              branch.governorate,
              branch.city,
              branch.phone,
            ].some((value) =>
              value
                ?.toLowerCase()
                .includes(query),
            ),
        ),
      [
        query,
        visibleBranches,
      ],
    );

  const filteredSports =
    useMemo(
      () =>
        visibleSports.filter(
          (sport) =>
            !query ||
            [
              sport.name,
              sport.code,
              sport.description,
            ].some((value) =>
              value
                ?.toLowerCase()
                .includes(query),
            ),
        ),
      [
        query,
        visibleSports,
      ],
    );

  const filteredPrograms =
    useMemo(
      () =>
        visiblePrograms.filter(
          (program) =>
            !query ||
            [
              program.name,
              program.code,
              program.description,
              program.sport?.name,
              LEVEL_LABELS[
                program.level
              ],
            ].some((value) =>
              value
                ?.toLowerCase()
                .includes(query),
            ),
        ),
      [
        query,
        visiblePrograms,
      ],
    );

  function setField(
    key: string,
    value: FormValue,
  ): void {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function closeForm(): void {
    if (saving) {
      return;
    }

    setFormKind(null);
    setEditingId(null);
    setForm({});
  }

  function openCreateAcademy(): void {
    setEditingId(null);

    setForm({
      name: '',
      slug: '',
      legalName: '',
      email: '',
      phone: '',
      logoUrl: '',
      timezone: 'Africa/Cairo',
      currency: 'EGP',
      status: 'TRIAL',
      isActive: true,
    });

    setFormKind('academy');
    setError('');
    setNotice('');
  }

  function openEditAcademy(
    academy: Academy,
  ): void {
    setEditingId(academy.id);

    setForm({
      name: academy.name,
      slug: academy.slug,
      legalName:
        academy.legalName ?? '',
      email: academy.email ?? '',
      phone: academy.phone ?? '',
      logoUrl:
        academy.logoUrl ?? '',
      timezone: academy.timezone,
      currency: academy.currency,
      status: academy.status,
      isActive: academy.isActive,
    });

    setFormKind('academy');
    setError('');
    setNotice('');
  }

  function openCreateBranch(): void {
    if (!selectedAcademyId) {
      setError(
        'يجب اختيار أكاديمية أولًا',
      );
      return;
    }

    setEditingId(null);

    setForm({
      academyId:
        selectedAcademyId,
      name: '',
      code: '',
      email: '',
      phone: '',
      address: '',
      governorate: '',
      city: '',
      isMain: false,
      isActive: true,
    });

    setFormKind('branch');
    setError('');
    setNotice('');
  }

  function openEditBranch(
    branch: Branch,
  ): void {
    setEditingId(branch.id);

    setForm({
      academyId:
        branch.academyId,
      name: branch.name,
      code: branch.code,
      email: branch.email ?? '',
      phone: branch.phone ?? '',
      address:
        branch.address ?? '',
      governorate:
        branch.governorate ?? '',
      city: branch.city ?? '',
      isMain: branch.isMain,
      isActive: branch.isActive,
    });

    setFormKind('branch');
    setError('');
    setNotice('');
  }

  function openCreateSport(): void {
    if (!selectedAcademyId) {
      setError(
        'يجب اختيار أكاديمية أولًا',
      );
      return;
    }

    setEditingId(null);

    setForm({
      academyId:
        selectedAcademyId,
      name: '',
      code: '',
      description: '',
      minimumAge: '',
      maximumAge: '',
      isActive: true,
    });

    setFormKind('sport');
    setError('');
    setNotice('');
  }

  function openEditSport(
    sport: Sport,
  ): void {
    setEditingId(sport.id);

    setForm({
      academyId:
        sport.academyId,
      name: sport.name,
      code: sport.code,
      description:
        sport.description ?? '',
      minimumAge:
        sport.minimumAge ?? '',
      maximumAge:
        sport.maximumAge ?? '',
      isActive: sport.isActive,
    });

    setFormKind('sport');
    setError('');
    setNotice('');
  }

  function openCreateProgram(): void {
    if (!selectedAcademyId) {
      setError(
        'يجب اختيار أكاديمية أولًا',
      );
      return;
    }

    if (
      visibleSports.length === 0
    ) {
      setError(
        'يجب إنشاء رياضة قبل إنشاء البرنامج',
      );
      return;
    }

    setEditingId(null);

    setForm({
      academyId:
        selectedAcademyId,
      sportId:
        visibleSports[0]?.id ?? '',
      name: '',
      code: '',
      description: '',
      level: 'ALL_LEVELS',
      minimumAge: '',
      maximumAge: '',
      sessionsPerWeek: '2',
      sessionDurationMinutes: '60',
      capacity: '',
      isActive: true,
    });

    setFormKind('program');
    setError('');
    setNotice('');
  }

  function openEditProgram(
    program: TrainingProgram,
  ): void {
    setEditingId(program.id);

    setForm({
      academyId:
        program.academyId,
      sportId: program.sportId,
      name: program.name,
      code: program.code,
      description:
        program.description ?? '',
      level: program.level,
      minimumAge:
        program.minimumAge ?? '',
      maximumAge:
        program.maximumAge ?? '',
      sessionsPerWeek:
        String(
          program.sessionsPerWeek,
        ),
      sessionDurationMinutes:
        String(
          program
            .sessionDurationMinutes,
        ),
      capacity:
        program.capacity ?? '',
      isActive:
        program.isActive,
    });

    setFormKind('program');
    setError('');
    setNotice('');
  }

  async function submitForm(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!formKind) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (formKind === 'academy') {
        const input = {
          name:
            valueString(
              form,
              'name',
            ).trim(),

          slug:
            valueString(
              form,
              'slug',
            )
              .trim()
              .toLowerCase(),

          legalName:
            optionalString(
              form.legalName,
            ),

          email:
            optionalString(
              form.email,
            ),

          phone:
            optionalString(
              form.phone,
            ),

          logoUrl:
            optionalString(
              form.logoUrl,
            ),

          timezone:
            optionalString(
              form.timezone,
            ),

          currency:
            valueString(
              form,
              'currency',
            )
              .trim()
              .toUpperCase(),

          status:
            valueString(
              form,
              'status',
            ) as AcademyStatus,

          isActive:
            valueBoolean(
              form,
              'isActive',
            ),
        };

        if (editingId) {
          await updateAcademy(
            editingId,
            input,
          );

          setNotice(
            'تم تحديث الأكاديمية',
          );
        } else {
          await createAcademy(
            input,
          );

          setNotice(
            'تم إنشاء الأكاديمية',
          );
        }
      }

      if (formKind === 'branch') {
        const input = {
          name:
            valueString(
              form,
              'name',
            ).trim(),

          code:
            valueString(
              form,
              'code',
            )
              .trim()
              .toUpperCase(),

          email:
            optionalString(
              form.email,
            ),

          phone:
            optionalString(
              form.phone,
            ),

          address:
            optionalString(
              form.address,
            ),

          governorate:
            optionalString(
              form.governorate,
            ),

          city:
            optionalString(
              form.city,
            ),

          isMain:
            valueBoolean(
              form,
              'isMain',
            ),

          isActive:
            valueBoolean(
              form,
              'isActive',
            ),
        };

        if (editingId) {
          await updateBranch(
            editingId,
            input,
          );

          setNotice(
            'تم تحديث الفرع',
          );
        } else {
          await createBranch({
            academyId:
              valueString(
                form,
                'academyId',
              ),

            ...input,
          });

          setNotice(
            'تم إنشاء الفرع',
          );
        }
      }

      if (formKind === 'sport') {
        const minimumAge =
          optionalNumber(
            form.minimumAge,
          );

        const maximumAge =
          optionalNumber(
            form.maximumAge,
          );

        validateAgeRange(
          minimumAge,
          maximumAge,
        );

        const input = {
          name:
            valueString(
              form,
              'name',
            ).trim(),

          code:
            valueString(
              form,
              'code',
            )
              .trim()
              .toUpperCase(),

          description:
            optionalString(
              form.description,
            ),

          minimumAge,
          maximumAge,

          isActive:
            valueBoolean(
              form,
              'isActive',
            ),
        };

        if (editingId) {
          await updateSport(
            editingId,
            input,
          );

          setNotice(
            'تم تحديث الرياضة',
          );
        } else {
          await createSport({
            academyId:
              valueString(
                form,
                'academyId',
              ),

            ...input,
          });

          setNotice(
            'تم إنشاء الرياضة',
          );
        }
      }

      if (formKind === 'program') {
        const minimumAge =
          optionalNumber(
            form.minimumAge,
          );

        const maximumAge =
          optionalNumber(
            form.maximumAge,
          );

        validateAgeRange(
          minimumAge,
          maximumAge,
        );

        const input = {
          name:
            valueString(
              form,
              'name',
            ).trim(),

          code:
            valueString(
              form,
              'code',
            )
              .trim()
              .toUpperCase(),

          description:
            optionalString(
              form.description,
            ),

          level:
            valueString(
              form,
              'level',
            ) as TrainingLevel,

          minimumAge,
          maximumAge,

          sessionsPerWeek:
            requiredInteger(
              form.sessionsPerWeek,
              'عدد الحصص أسبوعيًا',
              1,
              14,
            ),

          sessionDurationMinutes:
            requiredInteger(
              form
                .sessionDurationMinutes,
              'مدة الحصة',
              15,
              360,
            ),

          capacity:
            optionalNumber(
              form.capacity,
            ),

          isActive:
            valueBoolean(
              form,
              'isActive',
            ),
        };

        if (editingId) {
          await updateProgram(
            editingId,
            input,
          );

          setNotice(
            'تم تحديث البرنامج',
          );
        } else {
          await createProgram({
            academyId:
              valueString(
                form,
                'academyId',
              ),

            sportId:
              valueString(
                form,
                'sportId',
              ),

            ...input,
          });

          setNotice(
            'تم إنشاء البرنامج',
          );
        }
      }

      closeForm();

      await loadData(
        selectedAcademyId,
      );
    } catch (submitError: unknown) {
      setError(
        getSettingsApiError(
          submitError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(
    kind: FormKind,
    id: string,
    name: string,
  ): Promise<void> {
    const approved =
      window.confirm(
        `هل تريد حذف "${name}"؟`,
      );

    if (!approved) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (kind === 'academy') {
        await deleteAcademy(id);
      }

      if (kind === 'branch') {
        await deleteBranch(id);
      }

      if (kind === 'sport') {
        await deleteSport(id);
      }

      if (kind === 'program') {
        await deleteProgram(id);
      }

      setNotice('تم الحذف بنجاح');

      await loadData(
        kind === 'academy'
          ? undefined
          : selectedAcademyId,
      );
    } catch (removeError: unknown) {
      setError(
        getSettingsApiError(
          removeError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  function canEditBranch(
    branch: Branch,
  ): boolean {
    if (canManageCatalog) {
      return true;
    }

    return (
      isBranchManager &&
      data.currentMembership
        ?.branchId === branch.id
    );
  }

  function renderAcademies() {
    return (
      <div className="settings-grid">
        {filteredAcademies.map(
          (academy) => (
            <article
              className="settings-card"
              key={academy.id}
            >
              <header>
                <div>
                  <span className="settings-code">
                    {academy.slug}
                  </span>

                  <h2>
                    {academy.name}
                  </h2>

                  <p>
                    {academy.legalName ??
                      'لا يوجد اسم قانوني'}
                  </p>
                </div>

                <span
                  className={`settings-status settings-status-${academy.status.toLowerCase()}`}
                >
                  {
                    ACADEMY_STATUS_LABELS[
                      academy.status
                    ]
                  }
                </span>
              </header>

              <div className="settings-card-details">
                <div>
                  <span>الهاتف</span>
                  <strong>
                    {academy.phone ?? '—'}
                  </strong>
                </div>

                <div>
                  <span>البريد</span>
                  <strong>
                    {academy.email ?? '—'}
                  </strong>
                </div>

                <div>
                  <span>العملة</span>
                  <strong>
                    {academy.currency}
                  </strong>
                </div>

                <div>
                  <span>المنطقة الزمنية</span>
                  <strong>
                    {academy.timezone}
                  </strong>
                </div>
              </div>

              <footer>
                {canEditAcademy && (
                  <button
                    type="button"
                    onClick={() =>
                      openEditAcademy(
                        academy,
                      )
                    }
                  >
                    تعديل
                  </button>
                )}

                {isSuperAdmin && (
                  <button
                    type="button"
                    className="danger"
                    disabled={saving}
                    onClick={() =>
                      void removeItem(
                        'academy',
                        academy.id,
                        academy.name,
                      )
                    }
                  >
                    حذف
                  </button>
                )}
              </footer>
            </article>
          ),
        )}
      </div>
    );
  }

  function renderBranches() {
    return (
      <div className="settings-grid">
        {filteredBranches.map(
          (branch) => (
            <article
              className="settings-card"
              key={branch.id}
            >
              <header>
                <div>
                  <span className="settings-code">
                    {branch.code}
                  </span>

                  <h2>{branch.name}</h2>

                  <p>
                    {branch.governorate ??
                      'المحافظة غير محددة'}
                    {branch.city
                      ? ` — ${branch.city}`
                      : ''}
                  </p>
                </div>

                <span
                  className={
                    branch.isActive
                      ? 'settings-active-badge'
                      : 'settings-inactive-badge'
                  }
                >
                  {branch.isActive
                    ? 'نشط'
                    : 'متوقف'}
                </span>
              </header>

              <div className="settings-card-details">
                <div>
                  <span>الهاتف</span>
                  <strong>
                    {branch.phone ?? '—'}
                  </strong>
                </div>

                <div>
                  <span>البريد</span>
                  <strong>
                    {branch.email ?? '—'}
                  </strong>
                </div>

                <div>
                  <span>النوع</span>
                  <strong>
                    {branch.isMain
                      ? 'فرع رئيسي'
                      : 'فرع'}
                  </strong>
                </div>

                <div>
                  <span>العنوان</span>
                  <strong>
                    {branch.address ?? '—'}
                  </strong>
                </div>
              </div>

              <footer>
                {canEditBranch(branch) && (
                  <button
                    type="button"
                    onClick={() =>
                      openEditBranch(
                        branch,
                      )
                    }
                  >
                    تعديل
                  </button>
                )}

                {canManageCatalog && (
                  <button
                    type="button"
                    className="danger"
                    disabled={saving}
                    onClick={() =>
                      void removeItem(
                        'branch',
                        branch.id,
                        branch.name,
                      )
                    }
                  >
                    حذف
                  </button>
                )}
              </footer>
            </article>
          ),
        )}
      </div>
    );
  }

  function renderSports() {
    return (
      <div className="settings-grid">
        {filteredSports.map(
          (sport) => (
            <article
              className="settings-card"
              key={sport.id}
            >
              <header>
                <div>
                  <span className="settings-code">
                    {sport.code}
                  </span>

                  <h2>{sport.name}</h2>

                  <p>
                    {sport.description ??
                      'لا يوجد وصف'}
                  </p>
                </div>

                <span
                  className={
                    sport.isActive
                      ? 'settings-active-badge'
                      : 'settings-inactive-badge'
                  }
                >
                  {sport.isActive
                    ? 'نشطة'
                    : 'متوقفة'}
                </span>
              </header>

              <div className="settings-card-details">
                <div>
                  <span>
                    الحد الأدنى للعمر
                  </span>
                  <strong>
                    {sport.minimumAge ??
                      'غير محدد'}
                  </strong>
                </div>

                <div>
                  <span>
                    الحد الأقصى للعمر
                  </span>
                  <strong>
                    {sport.maximumAge ??
                      'غير محدد'}
                  </strong>
                </div>
              </div>

              <footer>
                {canManageCatalog && (
                  <button
                    type="button"
                    onClick={() =>
                      openEditSport(
                        sport,
                      )
                    }
                  >
                    تعديل
                  </button>
                )}

                {canManageCatalog && (
                  <button
                    type="button"
                    className="danger"
                    disabled={saving}
                    onClick={() =>
                      void removeItem(
                        'sport',
                        sport.id,
                        sport.name,
                      )
                    }
                  >
                    حذف
                  </button>
                )}
              </footer>
            </article>
          ),
        )}
      </div>
    );
  }

  function renderPrograms() {
    return (
      <div className="settings-grid">
        {filteredPrograms.map(
          (program) => (
            <article
              className="settings-card"
              key={program.id}
            >
              <header>
                <div>
                  <span className="settings-code">
                    {program.code}
                  </span>

                  <h2>{program.name}</h2>

                  <p>
                    {program.sport?.name ??
                      'رياضة غير محددة'}
                    {' — '}
                    {
                      LEVEL_LABELS[
                        program.level
                      ]
                    }
                  </p>
                </div>

                <span
                  className={
                    program.isActive
                      ? 'settings-active-badge'
                      : 'settings-inactive-badge'
                  }
                >
                  {program.isActive
                    ? 'نشط'
                    : 'متوقف'}
                </span>
              </header>

              <div className="settings-card-details">
                <div>
                  <span>الأعمار</span>
                  <strong>
                    {program.minimumAge ??
                      '—'}
                    {' - '}
                    {program.maximumAge ??
                      '—'}
                  </strong>
                </div>

                <div>
                  <span>
                    الحصص أسبوعيًا
                  </span>
                  <strong>
                    {
                      program.sessionsPerWeek
                    }
                  </strong>
                </div>

                <div>
                  <span>مدة الحصة</span>
                  <strong>
                    {
                      program.sessionDurationMinutes
                    }{' '}
                    دقيقة
                  </strong>
                </div>

                <div>
                  <span>السعة</span>
                  <strong>
                    {program.capacity ??
                      'غير محددة'}
                  </strong>
                </div>
              </div>

              {program.description && (
                <p className="settings-description">
                  {program.description}
                </p>
              )}

              <footer>
                {canManageCatalog && (
                  <button
                    type="button"
                    onClick={() =>
                      openEditProgram(
                        program,
                      )
                    }
                  >
                    تعديل
                  </button>
                )}

                {canManageCatalog && (
                  <button
                    type="button"
                    className="danger"
                    disabled={saving}
                    onClick={() =>
                      void removeItem(
                        'program',
                        program.id,
                        program.name,
                      )
                    }
                  >
                    حذف
                  </button>
                )}
              </footer>
            </article>
          ),
        )}
      </div>
    );
  }

  const activeCount =
    tab === 'academies'
      ? data.academies.filter(
          (item) => item.isActive,
        ).length
      : tab === 'branches'
        ? visibleBranches.filter(
            (item) => item.isActive,
          ).length
        : tab === 'sports'
          ? visibleSports.filter(
              (item) => item.isActive,
            ).length
          : visiblePrograms.filter(
              (item) => item.isActive,
            ).length;

  const totalCount =
    tab === 'academies'
      ? data.academies.length
      : tab === 'branches'
        ? visibleBranches.length
        : tab === 'sports'
          ? visibleSports.length
          : visiblePrograms.length;

  const canCreateCurrent =
    tab === 'academies'
      ? canCreateAcademy
      : tab === 'branches'
        ? canManageCatalog
        : canManageCatalog;

  function openCurrentCreate(): void {
    if (tab === 'academies') {
      openCreateAcademy();
    }

    if (tab === 'branches') {
      openCreateBranch();
    }

    if (tab === 'sports') {
      openCreateSport();
    }

    if (tab === 'programs') {
      openCreateProgram();
    }
  }

  return (
    <main
      className="settings-page"
      dir="rtl"
    >
      <header className="settings-header">
        <div>
          <button
            type="button"
            className="settings-back"
            onClick={onBack}
          >
            ← الرجوع إلى لوحة التحكم
          </button>

          <p className="settings-eyebrow">
            إعدادات المنصة
          </p>

          <h1>
            الأكاديميات والإعدادات
          </h1>

          <p className="settings-subtitle">
            إدارة الفروع والرياضات
            والبرامج التدريبية والبيانات
            الأساسية.
          </p>
        </div>

        {canCreateCurrent && (
          <button
            type="button"
            className="settings-primary-button"
            onClick={openCurrentCreate}
          >
            ＋ إضافة جديد
          </button>
        )}
      </header>

      <section className="settings-context">
        <div>
          <span>الحساب</span>
          <strong>
            {data.currentUser.fullName ||
              data.currentUser.email}
          </strong>
        </div>

        <div>
          <span>الأكاديمية الحالية</span>
          <strong>
            {selectedAcademy?.name ??
              'إدارة المنصة'}
          </strong>
        </div>
      </section>

      <section className="settings-statistics">
        <article>
          <span>إجمالي العناصر</span>
          <strong>{totalCount}</strong>
        </article>

        <article>
          <span>العناصر النشطة</span>
          <strong>{activeCount}</strong>
        </article>

        <article>
          <span>عدد الفروع</span>
          <strong>
            {visibleBranches.length}
          </strong>
        </article>

        <article>
          <span>عدد البرامج</span>
          <strong>
            {visiblePrograms.length}
          </strong>
        </article>
      </section>

      {(error || notice) && (
        <div
          className={
            error
              ? 'settings-message settings-error'
              : 'settings-message settings-success'
          }
        >
          {error || notice}
        </div>
      )}

      <nav className="settings-tabs">
        <button
          type="button"
          className={
            tab === 'academies'
              ? 'active'
              : ''
          }
          onClick={() => {
            setTab('academies');
            setSearch('');
          }}
        >
          الأكاديميات
        </button>

        <button
          type="button"
          className={
            tab === 'branches'
              ? 'active'
              : ''
          }
          onClick={() => {
            setTab('branches');
            setSearch('');
          }}
        >
          الفروع
        </button>

        <button
          type="button"
          className={
            tab === 'sports'
              ? 'active'
              : ''
          }
          onClick={() => {
            setTab('sports');
            setSearch('');
          }}
        >
          الرياضات
        </button>

        <button
          type="button"
          className={
            tab === 'programs'
              ? 'active'
              : ''
          }
          onClick={() => {
            setTab('programs');
            setSearch('');
          }}
        >
          البرامج التدريبية
        </button>
      </nav>

      <section className="settings-toolbar">
        <input
          type="search"
          value={search}
          placeholder="ابحث بالاسم أو الكود"
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        {isSuperAdmin &&
          tab !== 'academies' && (
            <select
              value={selectedAcademyId}
              onChange={(event) =>
                setSelectedAcademyId(
                  event.target.value,
                )
              }
            >
              <option value="">
                كل الأكاديميات
              </option>

              {data.academies.map(
                (academy) => (
                  <option
                    key={academy.id}
                    value={academy.id}
                  >
                    {academy.name}
                  </option>
                ),
              )}
            </select>
          )}

        <button
          type="button"
          onClick={() =>
            void loadData(
              selectedAcademyId,
            )
          }
        >
          تحديث
        </button>
      </section>

      <section className="settings-content">
        {loading ? (
          <div className="settings-empty">
            جارٍ تحميل الإعدادات...
          </div>
        ) : totalCount === 0 ? (
          <div className="settings-empty">
            <div>⚙️</div>

            <h2>
              لا توجد بيانات
            </h2>

            {canCreateCurrent && (
              <button
                type="button"
                className="settings-primary-button"
                onClick={
                  openCurrentCreate
                }
              >
                إضافة أول عنصر
              </button>
            )}
          </div>
        ) : (
          <>
            {tab === 'academies' &&
              renderAcademies()}

            {tab === 'branches' &&
              renderBranches()}

            {tab === 'sports' &&
              renderSports()}

            {tab === 'programs' &&
              renderPrograms()}
          </>
        )}
      </section>

      {formKind && (
        <div
          className="settings-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }
          }}
        >
          <section className="settings-modal">
            <header>
              <div>
                <p>إعدادات المنصة</p>

                <h2>
                  {editingId
                    ? 'تعديل البيانات'
                    : 'إضافة بيانات جديدة'}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
              >
                ×
              </button>
            </header>

            <form onSubmit={submitForm}>
              <div className="settings-form-grid">
                {formKind ===
                  'academy' && (
                  <>
                    <label>
                      اسم الأكاديمية
                      <input
                        required
                        minLength={2}
                        maxLength={160}
                        value={valueString(
                          form,
                          'name',
                        )}
                        onChange={(event) =>
                          setField(
                            'name',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      الرابط المختصر
                      <input
                        required
                        minLength={2}
                        maxLength={120}
                        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                        placeholder="academy-name"
                        value={valueString(
                          form,
                          'slug',
                        )}
                        onChange={(event) =>
                          setField(
                            'slug',
                            event.target
                              .value
                              .toLowerCase(),
                          )
                        }
                      />
                    </label>

                    <label>
                      الاسم القانوني
                      <input
                        maxLength={200}
                        value={valueString(
                          form,
                          'legalName',
                        )}
                        onChange={(event) =>
                          setField(
                            'legalName',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      البريد الإلكتروني
                      <input
                        type="email"
                        maxLength={160}
                        value={valueString(
                          form,
                          'email',
                        )}
                        onChange={(event) =>
                          setField(
                            'email',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      رقم الهاتف
                      <input
                        maxLength={30}
                        value={valueString(
                          form,
                          'phone',
                        )}
                        onChange={(event) =>
                          setField(
                            'phone',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      رابط الشعار
                      <input
                        type="url"
                        value={valueString(
                          form,
                          'logoUrl',
                        )}
                        onChange={(event) =>
                          setField(
                            'logoUrl',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      المنطقة الزمنية
                      <input
                        maxLength={80}
                        value={valueString(
                          form,
                          'timezone',
                        )}
                        onChange={(event) =>
                          setField(
                            'timezone',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      العملة
                      <input
                        required
                        minLength={3}
                        maxLength={3}
                        pattern="[A-Z]{3}"
                        value={valueString(
                          form,
                          'currency',
                        )}
                        onChange={(event) =>
                          setField(
                            'currency',
                            event.target
                              .value
                              .toUpperCase(),
                          )
                        }
                      />
                    </label>

                    <label>
                      الحالة
                      <select
                        value={valueString(
                          form,
                          'status',
                        )}
                        onChange={(event) =>
                          setField(
                            'status',
                            event.target
                              .value,
                          )
                        }
                      >
                        {Object.entries(
                          ACADEMY_STATUS_LABELS,
                        ).map(
                          ([
                            value,
                            label,
                          ]) => (
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
                  </>
                )}

                {formKind ===
                  'branch' && (
                  <>
                    <label>
                      اسم الفرع
                      <input
                        required
                        minLength={2}
                        maxLength={160}
                        value={valueString(
                          form,
                          'name',
                        )}
                        onChange={(event) =>
                          setField(
                            'name',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      كود الفرع
                      <input
                        required
                        minLength={2}
                        maxLength={60}
                        pattern="[A-Za-z0-9_-]+"
                        value={valueString(
                          form,
                          'code',
                        )}
                        onChange={(event) =>
                          setField(
                            'code',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      البريد الإلكتروني
                      <input
                        type="email"
                        maxLength={160}
                        value={valueString(
                          form,
                          'email',
                        )}
                        onChange={(event) =>
                          setField(
                            'email',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      رقم الهاتف
                      <input
                        maxLength={30}
                        value={valueString(
                          form,
                          'phone',
                        )}
                        onChange={(event) =>
                          setField(
                            'phone',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      المحافظة
                      <input
                        maxLength={120}
                        value={valueString(
                          form,
                          'governorate',
                        )}
                        onChange={(event) =>
                          setField(
                            'governorate',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      المدينة
                      <input
                        maxLength={120}
                        value={valueString(
                          form,
                          'city',
                        )}
                        onChange={(event) =>
                          setField(
                            'city',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label className="settings-full-field">
                      العنوان
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={valueString(
                          form,
                          'address',
                        )}
                        onChange={(event) =>
                          setField(
                            'address',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label className="settings-checkbox">
                      <input
                        type="checkbox"
                        checked={valueBoolean(
                          form,
                          'isMain',
                        )}
                        onChange={(event) =>
                          setField(
                            'isMain',
                            event.target
                              .checked,
                          )
                        }
                      />
                      فرع رئيسي
                    </label>
                  </>
                )}

                {formKind ===
                  'sport' && (
                  <>
                    <label>
                      اسم الرياضة
                      <input
                        required
                        minLength={2}
                        maxLength={120}
                        value={valueString(
                          form,
                          'name',
                        )}
                        onChange={(event) =>
                          setField(
                            'name',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      كود الرياضة
                      <input
                        required
                        minLength={2}
                        maxLength={50}
                        pattern="[A-Za-z0-9_-]+"
                        value={valueString(
                          form,
                          'code',
                        )}
                        onChange={(event) =>
                          setField(
                            'code',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      أقل عمر
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={valueString(
                          form,
                          'minimumAge',
                        )}
                        onChange={(event) =>
                          setField(
                            'minimumAge',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      أكبر عمر
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={valueString(
                          form,
                          'maximumAge',
                        )}
                        onChange={(event) =>
                          setField(
                            'maximumAge',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label className="settings-full-field">
                      الوصف
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={valueString(
                          form,
                          'description',
                        )}
                        onChange={(event) =>
                          setField(
                            'description',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>
                  </>
                )}

                {formKind ===
                  'program' && (
                  <>
                    <label>
                      اسم البرنامج
                      <input
                        required
                        minLength={2}
                        maxLength={160}
                        value={valueString(
                          form,
                          'name',
                        )}
                        onChange={(event) =>
                          setField(
                            'name',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      كود البرنامج
                      <input
                        required
                        minLength={2}
                        maxLength={60}
                        pattern="[A-Za-z0-9_-]+"
                        value={valueString(
                          form,
                          'code',
                        )}
                        onChange={(event) =>
                          setField(
                            'code',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      الرياضة
                      <select
                        required
                        disabled={
                          Boolean(editingId)
                        }
                        value={valueString(
                          form,
                          'sportId',
                        )}
                        onChange={(event) =>
                          setField(
                            'sportId',
                            event.target
                              .value,
                          )
                        }
                      >
                        {visibleSports.map(
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
                      المستوى
                      <select
                        value={valueString(
                          form,
                          'level',
                        )}
                        onChange={(event) =>
                          setField(
                            'level',
                            event.target
                              .value,
                          )
                        }
                      >
                        {Object.entries(
                          LEVEL_LABELS,
                        ).map(
                          ([
                            value,
                            label,
                          ]) => (
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
                      أقل عمر
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={valueString(
                          form,
                          'minimumAge',
                        )}
                        onChange={(event) =>
                          setField(
                            'minimumAge',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      أكبر عمر
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={valueString(
                          form,
                          'maximumAge',
                        )}
                        onChange={(event) =>
                          setField(
                            'maximumAge',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      الحصص أسبوعيًا
                      <input
                        required
                        type="number"
                        min={1}
                        max={14}
                        value={valueString(
                          form,
                          'sessionsPerWeek',
                        )}
                        onChange={(event) =>
                          setField(
                            'sessionsPerWeek',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      مدة الحصة بالدقائق
                      <input
                        required
                        type="number"
                        min={15}
                        max={360}
                        value={valueString(
                          form,
                          'sessionDurationMinutes',
                        )}
                        onChange={(event) =>
                          setField(
                            'sessionDurationMinutes',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      السعة
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        placeholder="اختياري"
                        value={valueString(
                          form,
                          'capacity',
                        )}
                        onChange={(event) =>
                          setField(
                            'capacity',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label className="settings-full-field">
                      الوصف
                      <textarea
                        rows={3}
                        maxLength={1500}
                        value={valueString(
                          form,
                          'description',
                        )}
                        onChange={(event) =>
                          setField(
                            'description',
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>
                  </>
                )}

                <label className="settings-checkbox">
                  <input
                    type="checkbox"
                    checked={valueBoolean(
                      form,
                      'isActive',
                    )}
                    onChange={(event) =>
                      setField(
                        'isActive',
                        event.target
                          .checked,
                      )
                    }
                  />
                  العنصر مفعل
                </label>
              </div>

              <footer>
                <button
                  type="button"
                  className="settings-secondary-button"
                  disabled={saving}
                  onClick={closeForm}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="settings-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'جارٍ الحفظ...'
                    : editingId
                      ? 'حفظ التعديلات'
                      : 'إضافة'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
