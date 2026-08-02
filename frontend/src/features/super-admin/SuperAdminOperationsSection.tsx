import { type FormEvent, useEffect, useMemo, useState } from "react";

const TOKEN_KEY = "haymclub_super_admin_token";

interface Props {
  section: string;
}

interface SystemUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  role?: string | null;
  academyId?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  requesterEmail?: string | null;
  createdAt: string;
}

interface AuditLog {
  id: string;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  category: string;
  isPublic: boolean;
  updatedAt: string;
}

interface SystemHealth {
  status: string;
  database: string;
  tables: number;
  uptimeSeconds: number;
  responseTimeMs: number;
  checkedAt: string;
}

function apiBase(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (window.location.hostname.endsWith(".app.github.dev")) {
    return (
      `${window.location.protocol}//` +
      window.location.hostname.replace(
        /-5173\.app\.github\.dev$/,
        "-3000.app.github.dev",
      ) +
      "/api"
    );
  }

  return "http://127.0.0.1:3000/api";
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

async function parseJson(response: Response): Promise<unknown> {
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

function displayDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("ar-EG");
}

export function SuperAdminOperationsSection({ section }: Props) {
  const [users, setUsers] = useState<SystemUser[]>([]);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [settings, setSettings] = useState<SystemSetting[]>([]);

  const [health, setHealth] = useState<SystemHealth | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [settingDrafts, setSettingDrafts] = useState<Record<string, string>>(
    {},
  );

  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    priority: "MEDIUM",
    requesterEmail: "",
  });

  const request = async <T,>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> => {
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

    const result = await parseJson(response);

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
  };

  const loadSection = async () => {
    setLoading(true);
    setError(null);

    try {
      if (section === "users") {
        const data = await request<SystemUser[]>(
          "/super-admin/management/users",
        );

        setUsers(Array.isArray(data) ? data : []);
      }

      if (section === "support") {
        const data = await request<SupportTicket[]>(
          "/super-admin/management/support-tickets",
        );

        setTickets(Array.isArray(data) ? data : []);
      }

      if (section === "audit") {
        const data = await request<AuditLog[]>(
          "/super-admin/management/audit-logs",
        );

        setLogs(Array.isArray(data) ? data : []);
      }

      if (section === "settings") {
        const [settingsData, healthData] = await Promise.all([
          request<SystemSetting[]>("/super-admin/management/settings"),

          request<SystemHealth>("/super-admin/management/health"),
        ]);

        setSettings(Array.isArray(settingsData) ? settingsData : []);

        setHealth(healthData);

        const drafts: Record<string, string> = {};

        for (const setting of settingsData) {
          drafts[setting.key] = JSON.stringify(setting.value);
        }

        setSettingDrafts(drafts);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "تعذر تحميل القسم.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSection();
  }, [section]);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return users;
    }

    return users.filter((user) =>
      [
        user.firstName ?? "",
        user.lastName ?? "",
        user.email ?? "",
        user.phone ?? "",
        user.role ?? "",
        user.status ?? "",
      ].some((field) => field.toLowerCase().includes(value)),
    );
  }, [search, users]);

  const updateUserStatus = async (userId: string, status: string) => {
    setLoading(true);
    setError(null);

    try {
      await request(`/super-admin/management/users/${userId}/status`, {
        method: "PATCH",

        body: JSON.stringify({
          status,
        }),
      });

      await loadSection();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "فشل تغيير حالة المستخدم.",
      );
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await request("/super-admin/management/support-tickets", {
        method: "POST",

        body: JSON.stringify({
          subject: ticketForm.subject,
          description: ticketForm.description,
          priority: ticketForm.priority,
          requesterEmail: ticketForm.requesterEmail || undefined,
        }),
      });

      setTicketForm({
        subject: "",
        description: "",
        priority: "MEDIUM",
        requesterEmail: "",
      });

      await loadSection();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "فشل إنشاء التذكرة.",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    setLoading(true);
    setError(null);

    try {
      await request(`/super-admin/management/support-tickets/${ticketId}`, {
        method: "PATCH",

        body: JSON.stringify({
          status,
        }),
      });

      await loadSection();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "فشل تحديث التذكرة.",
      );
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (setting: SystemSetting) => {
    setLoading(true);
    setError(null);

    try {
      const raw = settingDrafts[setting.key];

      let value: unknown;

      try {
        value = JSON.parse(raw);
      } catch {
        value = raw;
      }

      await request(
        `/super-admin/management/settings/${encodeURIComponent(setting.key)}`,
        {
          method: "PATCH",

          body: JSON.stringify({
            value,
            category: setting.category,
            isPublic: setting.isPublic,
          }),
        },
      );

      await loadSection();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "فشل حفظ الإعداد.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="sa-operations">
      <div className="sa-operations-toolbar">
        <div>
          <h2>
            {section === "users" && "مستخدمو النظام"}

            {section === "support" && "الدعم الفني"}

            {section === "audit" && "سجل العمليات"}

            {section === "settings" && "إعدادات النظام"}
          </h2>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void loadSection()}
        >
          تحديث البيانات
        </button>
      </div>

      {error && <div className="sa-alert">{error}</div>}

      {section === "users" && (
        <>
          <input
            className="sa-operations-search"
            type="search"
            value={search}
            placeholder="بحث بالاسم أو البريد أو الدور"
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="sa-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                  <th>الهاتف</th>
                  <th>آخر دخول</th>
                  <th>التحكم</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>
                        {[user.firstName, user.lastName]
                          .filter(Boolean)
                          .join(" ") || "مستخدم"}
                      </strong>

                      <small className="sa-cell-small">
                        {user.email ?? "—"}
                      </small>
                    </td>

                    <td>{user.role ?? "—"}</td>

                    <td>{user.status ?? "—"}</td>

                    <td>{user.phone ?? "—"}</td>

                    <td>{displayDate(user.lastLoginAt)}</td>

                    <td>
                      <select
                        value={user.status ?? "ACTIVE"}
                        disabled={loading}
                        onChange={(event) =>
                          void updateUserStatus(user.id, event.target.value)
                        }
                      >
                        <option value="ACTIVE">نشط</option>

                        <option value="INACTIVE">غير نشط</option>

                        <option value="SUSPENDED">موقوف</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {section === "support" && (
        <>
          <form className="sa-form sa-ticket-form" onSubmit={createTicket}>
            <h2>إنشاء تذكرة دعم</h2>

            <input
              required
              placeholder="عنوان المشكلة"
              value={ticketForm.subject}
              onChange={(event) =>
                setTicketForm({
                  ...ticketForm,
                  subject: event.target.value,
                })
              }
            />

            <input
              type="email"
              placeholder="بريد مقدم الطلب"
              value={ticketForm.requesterEmail}
              onChange={(event) =>
                setTicketForm({
                  ...ticketForm,
                  requesterEmail: event.target.value,
                })
              }
            />

            <select
              value={ticketForm.priority}
              onChange={(event) =>
                setTicketForm({
                  ...ticketForm,
                  priority: event.target.value,
                })
              }
            >
              <option value="LOW">منخفضة</option>

              <option value="MEDIUM">متوسطة</option>

              <option value="HIGH">عالية</option>

              <option value="URGENT">عاجلة</option>
            </select>

            <textarea
              required
              placeholder="تفاصيل المشكلة"
              value={ticketForm.description}
              onChange={(event) =>
                setTicketForm({
                  ...ticketForm,
                  description: event.target.value,
                })
              }
            />

            <button type="submit" disabled={loading}>
              حفظ التذكرة
            </button>
          </form>

          <div className="sa-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>التذكرة</th>
                  <th>الأولوية</th>
                  <th>الحالة</th>
                  <th>البريد</th>
                  <th>التاريخ</th>
                  <th>التحكم</th>
                </tr>
              </thead>

              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <strong>{ticket.subject}</strong>

                      <small className="sa-cell-small">
                        {ticket.description}
                      </small>
                    </td>

                    <td>{ticket.priority}</td>

                    <td>{ticket.status}</td>

                    <td>{ticket.requesterEmail ?? "—"}</td>

                    <td>{displayDate(ticket.createdAt)}</td>

                    <td>
                      <select
                        value={ticket.status}
                        disabled={loading}
                        onChange={(event) =>
                          void updateTicketStatus(ticket.id, event.target.value)
                        }
                      >
                        <option value="OPEN">مفتوحة</option>

                        <option value="IN_PROGRESS">قيد المعالجة</option>

                        <option value="WAITING_FOR_CUSTOMER">
                          انتظار العميل
                        </option>

                        <option value="RESOLVED">تم الحل</option>

                        <option value="CLOSED">مغلقة</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {section === "audit" && (
        <div className="sa-table-wrap">
          <table>
            <thead>
              <tr>
                <th>العملية</th>
                <th>الكيان</th>
                <th>معرف الكيان</th>
                <th>المستخدم</th>
                <th>التاريخ</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.action}</td>

                  <td>{log.entityType ?? "—"}</td>

                  <td>{log.entityId ?? "—"}</td>

                  <td>{log.actorUserId ?? "SYSTEM"}</td>

                  <td>{displayDate(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section === "settings" && (
        <>
          {health && (
            <div className="sa-health-grid">
              <article>
                <span>حالة النظام</span>

                <strong>{health.status}</strong>
              </article>

              <article>
                <span>قاعدة البيانات</span>

                <strong>{health.database}</strong>
              </article>

              <article>
                <span>عدد الجداول</span>

                <strong>{health.tables}</strong>
              </article>

              <article>
                <span>زمن الاستجابة</span>

                <strong>
                  {health.responseTimeMs}
                  ms
                </strong>
              </article>
            </div>
          )}

          <div className="sa-settings-list">
            {settings.map((setting) => (
              <article key={setting.id}>
                <div>
                  <strong>{setting.key}</strong>

                  <small>{setting.category}</small>
                </div>

                <input
                  value={settingDrafts[setting.key] ?? ""}
                  onChange={(event) =>
                    setSettingDrafts({
                      ...settingDrafts,
                      [setting.key]: event.target.value,
                    })
                  }
                />

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void saveSetting(setting)}
                >
                  حفظ
                </button>
              </article>
            ))}
          </div>
        </>
      )}

      {loading && <div className="sa-loading">جاري تنفيذ العملية...</div>}
    </section>
  );
}
