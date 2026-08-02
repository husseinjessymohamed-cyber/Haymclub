import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SuperAdminOperationsSection } from "./SuperAdminOperationsSection";

import { SuperAdminAcademiesSection } from "./SuperAdminAcademiesSection";
import "./SuperAdminPage.css";

const TOKEN_KEY = "haymclub_super_admin_token";

const DEFAULT_EMAIL = "superadmin@haymclub.com";

type Section =
  | "overview"
  | "academies"
  | "plans"
  | "subscriptions"
  | "payments"
  | "users"
  | "support"
  | "audit"
  | "settings";

interface Dashboard {
  metrics?: {
    academies?: {
      total?: number;
      active?: number;
      trial?: number;
      suspended?: number;
    };

    branches?: {
      total?: number;
    };

    users?: {
      total?: number;
    };

    trainees?: {
      total?: number;
    };
  };
}

interface Academy {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
}

interface Plan {
  id: string;
  name: string;
  code: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxBranches: number | null;
  maxUsers: number | null;
  maxTrainees: number | null;
  isActive: boolean;
}

interface Subscription {
  id: string;
  academyId: string;
  planId: string;
  planName: string;
  status: string;
  billingCycle: string;
  startsAt: string;
  endsAt: string;
  price: number;
  discount: number;
  paidAmount: number;
  balanceAmount: number;
}

interface Payment {
  id: string;
  academyId: string;
  subscriptionId: string | null;
  amount: number;
  paymentMethod: string;
  reference: string | null;
  paidAt: string;
}

interface LoginResult {
  accessToken?: string;
  access_token?: string;

  activeMembership?: {
    role?: string;
  };
}

const menu: Array<{
  id: Section;
  icon: string;
  label: string;
}> = [
  {
    id: "overview",
    icon: "📊",
    label: "نظرة عامة",
  },
  {
    id: "academies",
    icon: "🏢",
    label: "الأكاديميات",
  },
  {
    id: "plans",
    icon: "📦",
    label: "الباقات",
  },
  {
    id: "subscriptions",
    icon: "💳",
    label: "اشتراكات الأكاديميات",
  },
  {
    id: "payments",
    icon: "💰",
    label: "مدفوعات المنصة",
  },
  {
    id: "users",
    icon: "👥",
    label: "مستخدمو النظام",
  },
  {
    id: "support",
    icon: "🎫",
    label: "الدعم الفني",
  },
  {
    id: "audit",
    icon: "📋",
    label: "سجل العمليات",
  },
  {
    id: "settings",
    icon: "⚙️",
    label: "إعدادات النظام",
  },
];

const titles: Record<Section, string> = {
  overview: "لوحة تحكم السوبر أدمن",
  academies: "إدارة الأكاديميات",
  plans: "باقات Haymclub",
  subscriptions: "اشتراكات الأكاديميات",
  payments: "مدفوعات المنصة",
  users: "مستخدمو النظام",
  support: "الدعم الفني",
  audit: "سجل العمليات",
  settings: "إعدادات النظام",
};

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

function tokenRole(token: string): string | null {
  try {
    const encoded = token.split(".")[1];

    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");

    const payload = JSON.parse(
      atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")),
    ) as {
      role?: string;
    };

    return payload.role ?? null;
  } catch {
    return null;
  }
}

function money(value: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function numberValue(value: number | undefined): string {
  return new Intl.NumberFormat("ar-EG").format(value ?? 0);
}

function academyName(academies: Academy[], academyId: string): string {
  return (
    academies.find((academy) => academy.id === academyId)?.name ?? academyId
  );
}

async function readJson(response: Response): Promise<unknown> {
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

export function SuperAdminPage() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );

  const [email, setEmail] = useState(DEFAULT_EMAIL);

  const [password, setPassword] = useState("");

  const [section, setSection] = useState<Section>("overview");

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  const [academies, setAcademies] = useState<Academy[]>([]);

  const [plans, setPlans] = useState<Plan[]>([]);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);

  const [planForm, setPlanForm] = useState({
    name: "",
    code: "",
    monthlyPrice: "",
    yearlyPrice: "",
    maxBranches: "",
    maxUsers: "",
    maxTrainees: "",
  });

  const [subscriptionForm, setSubscriptionForm] = useState({
    academyId: "",
    planId: "",
    billingCycle: "MONTHLY",
    startsAt: new Date().toISOString().slice(0, 10),
    discount: "0",
    paidAmount: "0",
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    academyId: "",
    subscriptionId: "",
    amount: "",
    paymentMethod: "CASH",
    reference: "",
    notes: "",
  });

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);

    setToken(null);
    setDashboard(null);
    setAcademies([]);
    setPlans([]);
    setSubscriptions([]);
    setPayments([]);
    setError(null);
  }, []);

  const request = useCallback(
    async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      if (!token) {
        throw new Error("يجب تسجيل الدخول.");
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

      const result = await readJson(response);

      if (response.status === 401 || response.status === 403) {
        logout();

        throw new Error("انتهت جلسة السوبر أدمن.");
      }

      if (!response.ok) {
        const message =
          typeof result === "object" && result !== null && "message" in result
            ? String(
                (
                  result as {
                    message: unknown;
                  }
                ).message,
              )
            : `HTTP ${response.status}`;

        throw new Error(message);
      }

      return unwrap<T>(result);
    },
    [logout, token],
  );

  const loadOverview = useCallback(async () => {
    const data = await request<Dashboard>("/super-admin/dashboard");

    setDashboard(data);
  }, [request]);

  const loadAcademies = useCallback(async () => {
    const data = await request<Academy[]>("/super-admin/academies");

    setAcademies(Array.isArray(data) ? data : []);
  }, [request]);

  const loadPlans = useCallback(async () => {
    const data = await request<Plan[]>("/super-admin/saas/plans");

    setPlans(Array.isArray(data) ? data : []);
  }, [request]);

  const loadSubscriptions = useCallback(async () => {
    const data = await request<Subscription[]>(
      "/super-admin/saas/subscriptions",
    );

    setSubscriptions(Array.isArray(data) ? data : []);
  }, [request]);

  const loadPayments = useCallback(async () => {
    const data = await request<Payment[]>("/super-admin/saas/payments");

    setPayments(Array.isArray(data) ? data : []);
  }, [request]);

  const loadSection = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (section === "overview") {
        await loadOverview();
      }

      if (section === "academies") {
        await loadAcademies();
      }

      if (section === "plans") {
        await loadPlans();
      }

      if (section === "subscriptions") {
        await Promise.all([loadAcademies(), loadPlans(), loadSubscriptions()]);
      }

      if (section === "payments") {
        await Promise.all([
          loadAcademies(),
          loadSubscriptions(),
          loadPayments(),
        ]);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "تعذر تحميل البيانات.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    loadAcademies,
    loadOverview,
    loadPayments,
    loadPlans,
    loadSubscriptions,
    section,
    token,
  ]);

  useEffect(() => {
    if (!token) {
      return;
    }

    if (tokenRole(token) !== "SUPER_ADMIN") {
      logout();
      return;
    }

    void loadSection();
  }, [loadSection, logout, token]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase()}/auth/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: email.trim().toLowerCase(),

          password,
        }),
      });

      const raw = await readJson(response);

      if (!response.ok) {
        throw new Error("البريد أو كلمة المرور غير صحيحة.");
      }

      const result = unwrap<LoginResult>(raw);

      const accessToken = result.accessToken ?? result.access_token;

      const role =
        result.activeMembership?.role ??
        (accessToken ? tokenRole(accessToken) : null);

      if (!accessToken) {
        throw new Error("لم يتم استلام التوكن.");
      }

      if (role !== "SUPER_ADMIN") {
        throw new Error("الحساب ليس SUPER_ADMIN.");
      }

      localStorage.setItem(TOKEN_KEY, accessToken);

      setToken(accessToken);
      setPassword("");
      setSection("overview");
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "فشل تسجيل الدخول.",
      );
    } finally {
      setLoading(false);
    }
  };

  const createPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await request("/super-admin/saas/plans", {
        method: "POST",

        body: JSON.stringify({
          name: planForm.name,
          code: planForm.code,
          monthlyPrice: Number(planForm.monthlyPrice),
          yearlyPrice: Number(planForm.yearlyPrice),
          maxBranches: planForm.maxBranches
            ? Number(planForm.maxBranches)
            : undefined,
          maxUsers: planForm.maxUsers ? Number(planForm.maxUsers) : undefined,
          maxTrainees: planForm.maxTrainees
            ? Number(planForm.maxTrainees)
            : undefined,
        }),
      });

      setPlanForm({
        name: "",
        code: "",
        monthlyPrice: "",
        yearlyPrice: "",
        maxBranches: "",
        maxUsers: "",
        maxTrainees: "",
      });

      setShowForm(false);
      await loadPlans();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "فشل إنشاء الباقة.",
      );
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await request("/super-admin/saas/subscriptions", {
        method: "POST",

        body: JSON.stringify({
          academyId: subscriptionForm.academyId,
          planId: subscriptionForm.planId,
          billingCycle: subscriptionForm.billingCycle,
          startsAt: subscriptionForm.startsAt,
          discount: Number(subscriptionForm.discount || 0),
          paidAmount: Number(subscriptionForm.paidAmount || 0),
          notes: subscriptionForm.notes || undefined,
        }),
      });

      setShowForm(false);
      await loadSubscriptions();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "فشل إنشاء الاشتراك.",
      );
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await request("/super-admin/saas/payments", {
        method: "POST",

        body: JSON.stringify({
          academyId: paymentForm.academyId,
          subscriptionId: paymentForm.subscriptionId || undefined,
          amount: Number(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          reference: paymentForm.reference || undefined,
          notes: paymentForm.notes || undefined,
        }),
      });

      setPaymentForm({
        academyId: "",
        subscriptionId: "",
        amount: "",
        paymentMethod: "CASH",
        reference: "",
        notes: "",
      });

      setShowForm(false);

      await Promise.all([loadPayments(), loadSubscriptions()]);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "فشل تسجيل الدفعة.",
      );
    } finally {
      setLoading(false);
    }
  };

  const paymentSubscriptions = useMemo(
    () =>
      subscriptions.filter(
        (subscription) =>
          !paymentForm.academyId ||
          subscription.academyId === paymentForm.academyId,
      ),
    [paymentForm.academyId, subscriptions],
  );

  if (!token) {
    return (
      <main className="sa-login-page" dir="rtl">
        <form className="sa-login-card" onSubmit={login}>
          <div className="sa-logo">H</div>

          <h1>دخول السوبر أدمن</h1>

          <p>إدارة منصة Haymclub والأكاديميات المشتركة.</p>

          {error && <div className="sa-alert">{error}</div>}

          <label>
            البريد الإلكتروني أو رقم الهاتف
            <input
              type="text"
              value={email}
              required
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            كلمة المرور
            <input
              type="password"
              value={password}
              required
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button type="submit" disabled={loading}>
            دخول السوبر أدمن
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="sa-platform" dir="rtl">
      <aside className="sa-sidebar">
        <div className="sa-brand">
          <div>H</div>

          <span>
            <strong>Haymclub</strong>
            <small>SaaS Control</small>
          </span>
        </div>

        <div className="sa-account">
          🛡️
          <span>
            <strong>السوبر أدمن</strong>

            <small>SUPER_ADMIN</small>
          </span>
        </div>

        <nav>
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? "active" : ""}
              onClick={() => {
                setSection(item.id);
                setShowForm(false);
              }}
            >
              <span>{item.icon}</span>

              {item.label}
            </button>
          ))}
        </nav>

        <button type="button" className="sa-logout" onClick={logout}>
          تسجيل خروج السوبر أدمن
        </button>
      </aside>

      <section className="sa-content">
        <header className="sa-header">
          <div>
            <span>HAYMCLUB PLATFORM</span>

            <h1>{titles[section]}</h1>
          </div>

          <div className="sa-header-actions">
            {["plans", "subscriptions", "payments"].includes(section) && (
              <button
                type="button"
                onClick={() => setShowForm((value) => !value)}
              >
                {showForm ? "إغلاق النموذج" : "+ إضافة جديد"}
              </button>
            )}

            {[
              "overview",
              "academies",
              "plans",
              "subscriptions",
              "payments",
            ].includes(section) && (
              <button
                type="button"
                className="secondary"
                disabled={loading}
                onClick={() => void loadSection()}
              >
                تحديث البيانات
              </button>
            )}
          </div>
        </header>

        {error && <div className="sa-alert">{error}</div>}

        {section === "overview" && (
          <div className="sa-cards">
            <article>
              <span>إجمالي الأكاديميات</span>

              <strong>
                {numberValue(dashboard?.metrics?.academies?.total)}
              </strong>
            </article>

            <article>
              <span>الأكاديميات النشطة</span>

              <strong>
                {numberValue(dashboard?.metrics?.academies?.active)}
              </strong>
            </article>

            <article>
              <span>الفترة التجريبية</span>

              <strong>
                {numberValue(dashboard?.metrics?.academies?.trial)}
              </strong>
            </article>

            <article>
              <span>الفروع</span>

              <strong>
                {numberValue(dashboard?.metrics?.branches?.total)}
              </strong>
            </article>

            <article>
              <span>المستخدمون</span>

              <strong>{numberValue(dashboard?.metrics?.users?.total)}</strong>
            </article>

            <article>
              <span>المتدربون</span>

              <strong>
                {numberValue(dashboard?.metrics?.trainees?.total)}
              </strong>
            </article>
          </div>
        )}


        {section === "academies" && <SuperAdminAcademiesSection />}

        {section === "plans" && (
          <>
            {showForm && (
              <form className="sa-form" onSubmit={createPlan}>
                <h2>إضافة باقة جديدة</h2>

                <input
                  placeholder="اسم الباقة"
                  value={planForm.name}
                  required
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      name: event.target.value,
                    })
                  }
                />

                <input
                  placeholder="كود الباقة"
                  value={planForm.code}
                  required
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      code: event.target.value,
                    })
                  }
                />

                <input
                  type="number"
                  min="0"
                  placeholder="السعر الشهري"
                  value={planForm.monthlyPrice}
                  required
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      monthlyPrice: event.target.value,
                    })
                  }
                />

                <input
                  type="number"
                  min="0"
                  placeholder="السعر السنوي"
                  value={planForm.yearlyPrice}
                  required
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      yearlyPrice: event.target.value,
                    })
                  }
                />

                <input
                  type="number"
                  placeholder="الحد الأقصى للفروع"
                  value={planForm.maxBranches}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      maxBranches: event.target.value,
                    })
                  }
                />

                <input
                  type="number"
                  placeholder="الحد الأقصى للمستخدمين"
                  value={planForm.maxUsers}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      maxUsers: event.target.value,
                    })
                  }
                />

                <input
                  type="number"
                  placeholder="الحد الأقصى للمتدربين"
                  value={planForm.maxTrainees}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      maxTrainees: event.target.value,
                    })
                  }
                />

                <button type="submit">حفظ الباقة</button>
              </form>
            )}

            <div className="sa-grid">
              {plans.map((plan) => (
                <article key={plan.id}>
                  <span>{plan.code}</span>

                  <h2>{plan.name}</h2>

                  <strong>
                    {money(plan.monthlyPrice)}
                    <small>/ شهريًا</small>
                  </strong>

                  <p>سنوي: {money(plan.yearlyPrice)}</p>

                  <ul>
                    <li>الفروع: {plan.maxBranches ?? "غير محدود"}</li>

                    <li>المستخدمون: {plan.maxUsers ?? "غير محدود"}</li>

                    <li>المتدربون: {plan.maxTrainees ?? "غير محدود"}</li>
                  </ul>
                </article>
              ))}
            </div>
          </>
        )}

        {section === "subscriptions" && (
          <>
            {showForm && (
              <form className="sa-form" onSubmit={createSubscription}>
                <h2>إضافة اشتراك أكاديمية</h2>

                <select
                  value={subscriptionForm.academyId}
                  required
                  onChange={(event) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      academyId: event.target.value,
                    })
                  }
                >
                  <option value="">اختر الأكاديمية</option>

                  {academies.map((academy) => (
                    <option key={academy.id} value={academy.id}>
                      {academy.name}
                    </option>
                  ))}
                </select>

                <select
                  value={subscriptionForm.planId}
                  required
                  onChange={(event) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      planId: event.target.value,
                    })
                  }
                >
                  <option value="">اختر الباقة</option>

                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>

                <select
                  value={subscriptionForm.billingCycle}
                  onChange={(event) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      billingCycle: event.target.value,
                    })
                  }
                >
                  <option value="MONTHLY">شهري</option>
                  <option value="YEARLY">سنوي</option>
                </select>

                <input
                  type="date"
                  value={subscriptionForm.startsAt}
                  required
                  onChange={(event) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      startsAt: event.target.value,
                    })
                  }
                />

                <input
                  type="number"
                  min="0"
                  placeholder="الخصم"
                  value={subscriptionForm.discount}
                  onChange={(event) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      discount: event.target.value,
                    })
                  }
                />

                <input
                  type="number"
                  min="0"
                  placeholder="المدفوع"
                  value={subscriptionForm.paidAmount}
                  onChange={(event) =>
                    setSubscriptionForm({
                      ...subscriptionForm,
                      paidAmount: event.target.value,
                    })
                  }
                />

                <button type="submit">حفظ الاشتراك</button>
              </form>
            )}

            <div className="sa-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الأكاديمية</th>
                    <th>الباقة</th>
                    <th>الحالة</th>
                    <th>البداية</th>
                    <th>النهاية</th>
                    <th>السعر</th>
                    <th>المدفوع</th>
                    <th>المتبقي</th>
                  </tr>
                </thead>

                <tbody>
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id}>
                      <td>{academyName(academies, subscription.academyId)}</td>
                      <td>{subscription.planName}</td>
                      <td>{subscription.status}</td>
                      <td>{subscription.startsAt}</td>
                      <td>{subscription.endsAt}</td>
                      <td>{money(subscription.price)}</td>
                      <td>{money(subscription.paidAmount)}</td>
                      <td>{money(subscription.balanceAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {section === "payments" && (
          <>
            {showForm && (
              <form className="sa-form" onSubmit={createPayment}>
                <h2>تسجيل دفعة منصة</h2>

                <select
                  value={paymentForm.academyId}
                  required
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      academyId: event.target.value,
                      subscriptionId: "",
                    })
                  }
                >
                  <option value="">اختر الأكاديمية</option>

                  {academies.map((academy) => (
                    <option key={academy.id} value={academy.id}>
                      {academy.name}
                    </option>
                  ))}
                </select>

                <select
                  value={paymentForm.subscriptionId}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      subscriptionId: event.target.value,
                    })
                  }
                >
                  <option value="">بدون ربط باشتراك</option>

                  {paymentSubscriptions.map((subscription) => (
                    <option key={subscription.id} value={subscription.id}>
                      {subscription.planName} — {subscription.endsAt}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="المبلغ"
                  value={paymentForm.amount}
                  required
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: event.target.value,
                    })
                  }
                />

                <select
                  value={paymentForm.paymentMethod}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      paymentMethod: event.target.value,
                    })
                  }
                >
                  <option value="CASH">نقدي</option>
                  <option value="BANK_TRANSFER">تحويل بنكي</option>
                  <option value="CARD">بطاقة</option>
                  <option value="WALLET">محفظة إلكترونية</option>
                </select>

                <input
                  placeholder="رقم المرجع"
                  value={paymentForm.reference}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      reference: event.target.value,
                    })
                  }
                />

                <button type="submit">تسجيل الدفعة</button>
              </form>
            )}

            <div className="sa-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الأكاديمية</th>
                    <th>المبلغ</th>
                    <th>طريقة الدفع</th>
                    <th>المرجع</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{academyName(academies, payment.academyId)}</td>
                      <td>{money(payment.amount)}</td>
                      <td>{payment.paymentMethod}</td>
                      <td>{payment.reference ?? "—"}</td>
                      <td>
                        {new Date(payment.paidAt).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {["users", "support", "audit", "settings"].includes(section) && (
          <SuperAdminOperationsSection section={section} />
        )}

        {loading && <div className="sa-loading">جاري تنفيذ العملية...</div>}
      </section>
    </main>
  );
}
