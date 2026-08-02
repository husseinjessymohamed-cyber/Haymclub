import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./SuperAdminAcademiesSection.css";

const TOKEN_KEY = "haymclub_super_admin_token";

type PanelMode = "create" | "details" | "edit" | "manager" | "branch" | null;


type AcademyFeatureField =
  | "attendanceEnabled"
  | "notificationsEnabled"
  | "rankingsEnabled"
  | "galleryEnabled"
  | "subscriptionsEnabled"
  | "reportsEnabled";

const ACADEMY_FEATURE_OPTIONS: ReadonlyArray<{
  key: AcademyFeatureField;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    key: "attendanceEnabled",
    label: "الحضور والغياب",
    icon: "✓",
    description:
      "إنشاء الحصص وتسجيل حضور وغياب المتدربين.",
  },
  {
    key: "notificationsEnabled",
    label: "الرسائل والإشعارات",
    icon: "🔔",
    description:
      "إرسال الرسائل والتعليمات والتنبيهات.",
  },
  {
    key: "rankingsEnabled",
    label: "أفضل 10 متدربين",
    icon: "🏆",
    description:
      "تقييم وترتيب أفضل المتدربين.",
  },
  {
    key: "galleryEnabled",
    label: "معرض الأكاديمية",
    icon: "🎬",
    description:
      "رفع الصور والفيديوهات الخاصة بالأكاديمية.",
  },
  {
    key: "subscriptionsEnabled",
    label: "الاشتراكات",
    icon: "💳",
    description:
      "إدارة الخطط والمدفوعات والاشتراكات.",
  },
  {
    key: "reportsEnabled",
    label: "التقارير",
    icon: "📊",
    description:
      "التقارير والتحليلات وتصدير البيانات.",
  },
];
interface Academy {
  id: string;
  name: string;
  legalName?: string | null;
  legal_name?: string | null;
  slug?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  country?: string | null;
  currency?: string | null;
  timezone?: string | null;
  locale?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  attendanceEnabled?: boolean;
  attendance_enabled?: boolean;

  notificationsEnabled?: boolean;
  notifications_enabled?: boolean;

  rankingsEnabled?: boolean;
  rankings_enabled?: boolean;

  galleryEnabled?: boolean;
  gallery_enabled?: boolean;

  subscriptionsEnabled?: boolean;
  subscriptions_enabled?: boolean;

  reportsEnabled?: boolean;
  reports_enabled?: boolean;

}


function academyFeatureValue(
  academy: Academy,
  camelName: AcademyFeatureField,
  snakeName:
    | "attendance_enabled"
    | "notifications_enabled"
    | "rankings_enabled"
    | "gallery_enabled"
    | "subscriptions_enabled"
    | "reports_enabled",
): boolean {
  const camelValue = academy[camelName];

  if (typeof camelValue === "boolean") {
    return camelValue;
  }

  const snakeValue = academy[snakeName];

  return typeof snakeValue === "boolean"
    ? snakeValue
    : true;
}

interface ManagerRow {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  branchId?: string | null;
}

interface AcademyDetails {
  academy: Academy;
  branches: Array<Record<string, unknown>>;
  managers: ManagerRow[];
}

function apiBase(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (location.hostname.endsWith(".app.github.dev")) {
    return (
      `${location.protocol}//` +
      location.hostname.replace(
        /-5173\.app\.github\.dev$/,
        "-3000.app.github.dev",
      ) +
      "/api"
    );
  }

  return "/api";
}

function unwrap<T>(value: unknown): T {
  if (typeof value === "object" && value !== null && "data" in value) {
    return (
      value as {
        data: T;
      }
    ).data;
  }

  return value as T;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
}

function statusValue(academy: Academy): string {
  if (academy.status) {
    return academy.status.toUpperCase();
  }

  if (academy.isActive === false || academy.is_active === false) {
    return "SUSPENDED";
  }

  return "ACTIVE";
}

function dateValue(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ar-EG");
}

function fieldValue(
  record: Record<string, unknown>,
  candidates: readonly string[],
): string {
  for (const candidate of candidates) {
    const value = record[candidate];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }

  return "—";
}

export function SuperAdminAcademiesSection() {
  const [academies, setAcademies] = useState<Academy[]>([]);

  const [selected, setSelected] = useState<Academy | null>(null);

  const [details, setDetails] = useState<AcademyDetails | null>(null);

  const [panelMode, setPanelMode] = useState<PanelMode>(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const [academyForm, setAcademyForm] = useState({
    name: "",
    legalName: "",
    slug: "",
    email: "",
    phone: "",
    status: "ACTIVE",
    country: "EG",
    currency: "EGP",
    timezone: "Africa/Cairo",
    locale: "ar",
    attendanceEnabled: false,
    notificationsEnabled: false,
    rankingsEnabled: false,
    galleryEnabled: false,
    subscriptionsEnabled: false,
    reportsEnabled: false,
  });

  const [managerForm, setManagerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    branchId: "",
  });

  const [branchForm, setBranchForm] = useState({
    name: "",
    phone: "",
    city: "القاهرة",
    address: "",
  });

  const request = useCallback(
    async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        throw new Error("جلسة السوبر أدمن غير موجودة.");
      }

      const response = await fetch(`${apiBase()}${endpoint}`, {
        ...options,

        headers: {
          Accept: "application/json",

          Authorization: `Bearer ${token}`,

          ...(options.body
            ? {
                "Content-Type": "application/json",
              }
            : {}),

          ...options.headers,
        },
      });

      const result = await parseResponse(response);

      if (!response.ok) {
        const message =
          typeof result === "object" && result !== null && "message" in result
            ? (
                result as {
                  message: unknown;
                }
              ).message
            : `HTTP ${response.status}`;

        throw new Error(
          Array.isArray(message) ? message.join("، ") : String(message),
        );
      }

      return unwrap<T>(result);
    },
    [],
  );

  const loadAcademies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await request<Academy[]>("/super-admin/academies");

      setAcademies(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل الأكاديميات.",
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  const loadDetails = useCallback(
    async (academyId: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await request<AcademyDetails>(
          `/super-admin/academies/${academyId}`,
        );

        setDetails(result);
        setSelected(result.academy);

        return result;
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "تعذر تحميل تفاصيل الأكاديمية.",
        );

        return null;
      } finally {
        setLoading(false);
      }
    },
    [request],
  );

  useEffect(() => {
    void loadAcademies();
  }, [loadAcademies]);

  const filteredAcademies = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return academies;
    }

    return academies.filter((academy) =>
      [
        academy.name,
        academy.slug ?? "",
        academy.email ?? "",
        academy.phone ?? "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [academies, search]);

  const closePanel = () => {
    setPanelMode(null);
    setError(null);
  };

  const openCreate = () => {
    setSelected(null);
    setDetails(null);

    setAcademyForm({
      name: "",
      legalName: "",
      slug: "",
      email: "",
      phone: "",
      status: "ACTIVE",
      country: "EG",
      currency: "EGP",
      timezone: "Africa/Cairo",
      locale: "ar",
      attendanceEnabled: false,
      notificationsEnabled: false,
      rankingsEnabled: false,
      galleryEnabled: false,
      subscriptionsEnabled: false,
      reportsEnabled: false,
    });

    setPanelMode("create");
    setError(null);
    setSuccess(null);
  };

  const openDetails = async (academy: Academy) => {
    setSelected(academy);
    setPanelMode("details");
    setSuccess(null);

    await loadDetails(academy.id);
  };

  const openEdit = async (academy: Academy) => {
    setSelected(academy);

    setAcademyForm({
      name: academy.name ?? "",
      legalName: academy.legalName ?? academy.legal_name ?? "",
      slug: academy.slug ?? "",
      email: academy.email ?? "",
      phone: academy.phone ?? "",
      status: statusValue(academy),
      country: academy.country ?? "EG",
      currency: academy.currency ?? "EGP",
      timezone: academy.timezone ?? "Africa/Cairo",
      locale: academy.locale ?? "ar",
      attendanceEnabled:
        academyFeatureValue(
          academy,
          "attendanceEnabled",
          "attendance_enabled",
        ),

      notificationsEnabled:
        academyFeatureValue(
          academy,
          "notificationsEnabled",
          "notifications_enabled",
        ),

      rankingsEnabled:
        academyFeatureValue(
          academy,
          "rankingsEnabled",
          "rankings_enabled",
        ),

      galleryEnabled:
        academyFeatureValue(
          academy,
          "galleryEnabled",
          "gallery_enabled",
        ),

      subscriptionsEnabled:
        academyFeatureValue(
          academy,
          "subscriptionsEnabled",
          "subscriptions_enabled",
        ),

      reportsEnabled:
        academyFeatureValue(
          academy,
          "reportsEnabled",
          "reports_enabled",
        ),

    });

    setPanelMode("edit");
    setError(null);
  };

  const openManager = async (academy: Academy) => {
    setSelected(academy);

    setManagerForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
        branchId: "",
    });

    setPanelMode("manager");
    setError(null);

    await loadDetails(academy.id);
  };

  const openBranch = (academy: Academy) => {
    setSelected(academy);

    setBranchForm({
      name: `${academy.name} - الفرع الرئيسي`,
      phone: academy.phone ?? "",
      city: "القاهرة",
      address: "",
    });

    setPanelMode("branch");
    setError(null);
  };

  const createAcademy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await request("/super-admin/academies", {
        method: "POST",

        body: JSON.stringify({
          name: academyForm.name.trim(),

          legalName: academyForm.legalName.trim() || undefined,

          slug: academyForm.slug.trim() || undefined,

          email: academyForm.email.trim() || undefined,

          phone: academyForm.phone.trim() || undefined,

          status: academyForm.status,

            attendanceEnabled:
              academyForm.attendanceEnabled,

            notificationsEnabled:
              academyForm.notificationsEnabled,

            rankingsEnabled:
              academyForm.rankingsEnabled,

            galleryEnabled:
              academyForm.galleryEnabled,

            subscriptionsEnabled:
              academyForm.subscriptionsEnabled,

            reportsEnabled:
              academyForm.reportsEnabled,
}),
      });

      setPanelMode(null);

      setSuccess("تم إنشاء الأكاديمية بنجاح.");

      await loadAcademies();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "فشل إنشاء الأكاديمية.",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateAcademy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selected) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await request(`/super-admin/academies/${selected.id}`, {
        method: "PATCH",

        body: JSON.stringify({
          name: academyForm.name.trim(),

          legalName: academyForm.legalName.trim() || undefined,

          slug: academyForm.slug.trim() || undefined,

          email: academyForm.email.trim() || undefined,

          phone: academyForm.phone.trim() || undefined,

          status: academyForm.status,

          country: academyForm.country,

          currency: academyForm.currency,

          timezone: academyForm.timezone,

          locale: academyForm.locale,

            attendanceEnabled:
              academyForm.attendanceEnabled,

            notificationsEnabled:
              academyForm.notificationsEnabled,

            rankingsEnabled:
              academyForm.rankingsEnabled,

            galleryEnabled:
              academyForm.galleryEnabled,

            subscriptionsEnabled:
              academyForm.subscriptionsEnabled,

            reportsEnabled:
              academyForm.reportsEnabled,
}),
      });

      setPanelMode(null);

      setSuccess("تم تحديث الأكاديمية بنجاح.");

      await loadAcademies();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "فشل تحديث الأكاديمية.",
      );
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (academy: Academy) => {
    const current = statusValue(academy);

    const next = current === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

    const confirmed = window.confirm(
      next === "SUSPENDED"
        ? `هل تريد إيقاف ${academy.name}؟`
        : `هل تريد تفعيل ${academy.name}؟`,
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await request(`/super-admin/academies/${academy.id}/status`, {
        method: "PATCH",

        body: JSON.stringify({
          status: next,
        }),
      });

      setSuccess(
        next === "SUSPENDED" ? "تم إيقاف الأكاديمية." : "تم تفعيل الأكاديمية.",
      );

      await loadAcademies();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "فشل تغيير حالة الأكاديمية.",
      );
    } finally {
      setLoading(false);
    }
  };

  const createManager = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selected) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await request(`/super-admin/academies/${selected.id}/manager`, {
        method: "POST",

        body: JSON.stringify({
          firstName: managerForm.firstName.trim(),

          lastName: managerForm.lastName.trim(),

          email: managerForm.email.trim().toLowerCase(),

          phone: managerForm.phone.trim(),
branchId: managerForm.branchId || undefined,
        }),
      });

      setPanelMode(null);

      setSuccess("تم إنشاء المدير وإرسال رابط إنشاء كلمة المرور إلى بريده.");

      await loadAcademies();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "فشل إنشاء مدير الأكاديمية.",
      );
    } finally {
      setLoading(false);
    }
  };

  const ensureBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selected) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await request(`/super-admin/academies/${selected.id}/main-branch`, {
        method: "POST",

        body: JSON.stringify({
          name: branchForm.name.trim() || undefined,

          phone: branchForm.phone.trim() || undefined,

          city: branchForm.city.trim() || undefined,

          address: branchForm.address.trim() || undefined,
        }),
      });

      setPanelMode(null);

      setSuccess("تم تجهيز الفرع الرئيسي بنجاح.");

      await loadAcademies();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "فشل تجهيز الفرع الرئيسي.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="sacademy-section">
      <div className="sacademy-toolbar">
        <div>
          <h2>الأكاديميات المسجلة</h2>

          <p>إجمالي النتائج: {filteredAcademies.length}</p>
        </div>

        <div className="sacademy-actions">
          <button
            type="button"
            className="secondary"
            disabled={loading}
            onClick={() => void loadAcademies()}
          >
            تحديث البيانات
          </button>

          <button type="button" className="primary" onClick={openCreate}>
            + إضافة أكاديمية جديدة
          </button>
        </div>
      </div>

      {error && <div className="sacademy-message error">{error}</div>}

      {success && <div className="sacademy-message success">{success}</div>}

      {panelMode && (
        <div className="sacademy-panel">
          <div className="sacademy-panel-head">
            <div>
              <h3>
                {panelMode === "create" && "إضافة أكاديمية جديدة"}

                {panelMode === "details" && "تفاصيل الأكاديمية"}

                {panelMode === "edit" && "تعديل الأكاديمية"}

                {panelMode === "manager" && "إضافة مدير أكاديمية"}

                {panelMode === "branch" && "الفرع الرئيسي"}
              </h3>

              {selected && <p>{selected.name}</p>}
            </div>

            <button type="button" className="close" onClick={closePanel}>
              ×
            </button>
          </div>

          {(panelMode === "create" || panelMode === "edit") && (
            <form
              className="sacademy-form"
              onSubmit={panelMode === "create" ? createAcademy : updateAcademy}
            >
              <label>
                <span>اسم الأكاديمية *</span>

                <input
                  required
                  minLength={2}
                  value={academyForm.name}
                  onChange={(event) =>
                    setAcademyForm({
                      ...academyForm,
                      name: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>الاسم القانوني</span>

                <input
                  value={academyForm.legalName}
                  onChange={(event) =>
                    setAcademyForm({
                      ...academyForm,
                      legalName: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>الرابط المختصر</span>

                <input
                  dir="ltr"
                  value={academyForm.slug}
                  onChange={(event) =>
                    setAcademyForm({
                      ...academyForm,
                      slug: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>البريد الإلكتروني</span>

                <input
                  dir="ltr"
                  type="email"
                  value={academyForm.email}
                  onChange={(event) =>
                    setAcademyForm({
                      ...academyForm,
                      email: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>الهاتف *</span>

                <input
                  dir="ltr"
                  value={academyForm.phone}
                  onChange={(event) =>
                    setAcademyForm({
                      ...academyForm,
                      phone: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>الحالة</span>

                <select
                  value={academyForm.status}
                  onChange={(event) =>
                    setAcademyForm({
                      ...academyForm,
                      status: event.target.value,
                    })
                  }
                >
                  <option value="ACTIVE">نشطة</option>

                  <option value="TRIAL">فترة تجريبية</option>

                  <option value="SUSPENDED">موقوفة</option>
                </select>
              </label>

              {panelMode === "edit" && (
                <>
                  <label>
                    <span>الدولة</span>

                    <input
                      value={academyForm.country}
                      onChange={(event) =>
                        setAcademyForm({
                          ...academyForm,
                          country: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>العملة</span>

                    <input
                      value={academyForm.currency}
                      onChange={(event) =>
                        setAcademyForm({
                          ...academyForm,
                          currency: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>المنطقة الزمنية</span>

                    <input
                      dir="ltr"
                      value={academyForm.timezone}
                      onChange={(event) =>
                        setAcademyForm({
                          ...academyForm,
                          timezone: event.target.value,
                        })
                      }
                    />
                  </label>
                </>
              )}
              <fieldset className="sacademy-features-fieldset">
                <legend>
                  الخصائص المتفق عليها مع الأكاديمية
                </legend>

                <p>
                  فعّل فقط الخصائص الموجودة ضمن الاتفاق.
                  ويمكن تعديلها لاحقًا من نفس الشاشة.
                </p>

                <div className="sacademy-features-grid">
                  {ACADEMY_FEATURE_OPTIONS.map(
                    (feature) => (
                      <label
                        key={feature.key}
                        className={
                          academyForm[feature.key]
                            ? "sacademy-feature-option active"
                            : "sacademy-feature-option"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={
                            academyForm[feature.key]
                          }
                          onChange={(event) =>
                            setAcademyForm(
                              (current) => ({
                                ...current,
                                [feature.key]:
                                  event.target.checked,
                              }),
                            )
                          }
                        />

                        <span className="sacademy-feature-icon">
                          {feature.icon}
                        </span>

                        <span className="sacademy-feature-copy">
                          <strong>
                            {feature.label}
                          </strong>

                          <small>
                            {feature.description}
                          </small>
                        </span>
                      </label>
                    ),
                  )}
                </div>
              </fieldset>



              <div className="sacademy-form-buttons">
                <button
                  type="button"
                  className="secondary"
                  onClick={closePanel}
                >
                  إلغاء
                </button>

                <button type="submit" className="primary" disabled={loading}>
                  {loading
                    ? "جاري الحفظ..."
                    : panelMode === "create"
                      ? "إنشاء الأكاديمية"
                      : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          )}

          {panelMode === "manager" && (
            <form className="sacademy-form" onSubmit={createManager}>
              <label>
                <span>الاسم الأول *</span>

                <input
                  required
                  value={managerForm.firstName}
                  onChange={(event) =>
                    setManagerForm({
                      ...managerForm,
                      firstName: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>اسم العائلة *</span>

                <input
                  required
                  value={managerForm.lastName}
                  onChange={(event) =>
                    setManagerForm({
                      ...managerForm,
                      lastName: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>البريد الإلكتروني *</span>

                <input
                  required
                  dir="ltr"
                  type="email"
                  value={managerForm.email}
                  onChange={(event) =>
                    setManagerForm({
                      ...managerForm,
                      email: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>الهاتف</span>

                <input
                  dir="ltr"
                  required
                  value={managerForm.phone}
                  onChange={(event) =>
                    setManagerForm({
                      ...managerForm,
                      phone: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>الفرع</span>

                <select
                  value={managerForm.branchId}
                  onChange={(event) =>
                    setManagerForm({
                      ...managerForm,
                      branchId: event.target.value,
                    })
                  }
                >
                  <option value="">الفرع الرئيسي تلقائيًا</option>

                  {details?.branches.map((branch, index) => {
                    const id = fieldValue(branch, ["id"]);

                    return (
                      <option
                        key={`${id}-${index}`}
                        value={id === "—" ? "" : id}
                      >
                        {fieldValue(branch, ["name"])}
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="sacademy-form-buttons">
                <button
                  type="button"
                  className="secondary"
                  onClick={closePanel}
                >
                  إلغاء
                </button>

                <button type="submit" className="primary" disabled={loading}>
                  إنشاء المدير
                </button>
              </div>
            </form>
          )}

          {panelMode === "branch" && (
            <form className="sacademy-form" onSubmit={ensureBranch}>
              <label>
                <span>اسم الفرع</span>

                <input
                  value={branchForm.name}
                  onChange={(event) =>
                    setBranchForm({
                      ...branchForm,
                      name: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>الهاتف</span>

                <input
                  dir="ltr"
                  value={branchForm.phone}
                  onChange={(event) =>
                    setBranchForm({
                      ...branchForm,
                      phone: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>المدينة</span>

                <input
                  value={branchForm.city}
                  onChange={(event) =>
                    setBranchForm({
                      ...branchForm,
                      city: event.target.value,
                    })
                  }
                />
              </label>

              <label className="wide">
                <span>العنوان</span>

                <input
                  value={branchForm.address}
                  onChange={(event) =>
                    setBranchForm({
                      ...branchForm,
                      address: event.target.value,
                    })
                  }
                />
              </label>

              <div className="sacademy-form-buttons">
                <button
                  type="button"
                  className="secondary"
                  onClick={closePanel}
                >
                  إلغاء
                </button>

                <button type="submit" className="primary" disabled={loading}>
                  تجهيز الفرع الرئيسي
                </button>
              </div>
            </form>
          )}

          {panelMode === "details" && (
            <div className="sacademy-details">
              <div className="sacademy-info-grid">
                <article>
                  <span>الأكاديمية</span>

                  <strong>{details?.academy.name ?? "—"}</strong>
                </article>

                <article>
                  <span>الحالة</span>

                  <strong>
                    {details ? statusValue(details.academy) : "—"}
                  </strong>
                </article>

                <article>
                  <span>البريد</span>

                  <strong>{details?.academy.email ?? "—"}</strong>
                </article>

                <article>
                  <span>الهاتف</span>

                  <strong>{details?.academy.phone ?? "—"}</strong>
                </article>
              </div>

              <h4>الفروع</h4>

              <div className="sacademy-mini-grid">
                {details?.branches.length ? (
                  details.branches.map((branch, index) => (
                    <article key={index}>
                      <strong>{fieldValue(branch, ["name"])}</strong>

                      <small>{fieldValue(branch, ["city", "phone"])}</small>
                    </article>
                  ))
                ) : (
                  <p>لا توجد فروع مسجلة.</p>
                )}
              </div>

              <h4>مديرو الأكاديمية</h4>

              <div className="sacademy-mini-grid">
                {details?.managers.length ? (
                  details.managers.map((manager, index) => (
                    <article key={manager.id ?? index}>
                      <strong>
                        {[manager.firstName, manager.lastName]
                          .filter(Boolean)
                          .join(" ") || "مدير"}
                      </strong>

                      <small>{manager.email ?? "—"}</small>

                      <small>{manager.role ?? "—"}</small>
                    </article>
                  ))
                ) : (
                  <p>لا يوجد مديرون.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <input
        className="sacademy-search"
        type="search"
        value={search}
        placeholder="بحث باسم الأكاديمية أو البريد أو الهاتف"
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="sacademy-table-wrap">
        <table>
          <thead>
            <tr>
              <th>الأكاديمية</th>

              <th>الحالة</th>

              <th>الهاتف</th>

              <th>البريد</th>

              <th>تاريخ الإنشاء</th>

              <th>التحكم</th>
            </tr>
          </thead>

          <tbody>
            {filteredAcademies.map((academy) => (
              <tr key={academy.id}>
                <td>
                  <div className="sacademy-name">
                    <span>{academy.name.trim().charAt(0)}</span>

                    <div>
                      <strong>{academy.name}</strong>

                      <small>{academy.slug ?? "بدون رابط"}</small>
                    </div>
                  </div>
                </td>

                <td>
                  <span
                    className={`sacademy-status ${statusValue(
                      academy,
                    ).toLowerCase()}`}
                  >
                    {statusValue(academy)}
                  </span>
                </td>

                <td>{academy.phone ?? "—"}</td>

                <td>{academy.email ?? "—"}</td>

                <td>{dateValue(academy.createdAt ?? academy.created_at)}</td>

                <td>
                  <div className="sacademy-row-actions">
                    <button
                      type="button"
                      onClick={() => void openDetails(academy)}
                    >
                      عرض
                    </button>

                    <button
                      type="button"
                      onClick={() => void openEdit(academy)}
                    >
                      تعديل
                    </button>

                    <button
                      type="button"
                      onClick={() => void openManager(academy)}
                    >
                      إضافة مدير
                    </button>

                    <button type="button" onClick={() => openBranch(academy)}>
                      الفرع الرئيسي
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() => void changeStatus(academy)}
                    >
                      {statusValue(academy) === "SUSPENDED" ? "تفعيل" : "إيقاف"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && filteredAcademies.length === 0 && (
          <div className="sacademy-empty">لا توجد أكاديميات مطابقة.</div>
        )}
      </div>

      {loading && <div className="sacademy-loading">جاري تنفيذ العملية...</div>}
    </section>
  );
}
