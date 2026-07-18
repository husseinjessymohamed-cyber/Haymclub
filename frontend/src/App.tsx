import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import type { FormEvent } from 'react';

import './App.css';
import {
  getDashboardOverview,
  login,
} from './lib/api';

const getErrorMessage = (
  error: unknown,
): string => {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join('، ');
    }

    return (
      message ??
      'تعذر الاتصال بالخادم'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'حدث خطأ غير متوقع';
};

const formatMoney = (
  amount: number,
): string =>
  new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (
  date: string,
): string =>
  new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));

interface LoginPageProps {
  onSuccess: (token: string) => void;
}

function LoginPage({
  onSuccess,
}: LoginPageProps) {
  const [email, setEmail] = useState(
    'admin@haymclub.com',
  );

  const [password, setPassword] = useState('');

  const loginMutation = useMutation({
    mutationFn: () =>
      login(email, password),

    onSuccess: (token) => {
      localStorage.setItem(
        'haymclub_token',
        token,
      );

      onSuccess(token);
    },
  });

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    loginMutation.mutate();
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-logo">
          H
        </div>

        <p className="small-title">
          منصة إدارة الأكاديميات
        </p>

        <h1>Haymclub</h1>

        <p className="description">
          سجّل الدخول للوصول إلى لوحة التحكم
          وإدارة بيانات الأكاديمية.
        </p>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <label>
            البريد الإلكتروني

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              required
            />
          </label>

          <label>
            كلمة المرور

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              required
            />
          </label>

          {loginMutation.isError && (
            <div className="error-box">
              {getErrorMessage(
                loginMutation.error,
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={
              loginMutation.isPending
            }
          >
            {loginMutation.isPending
              ? 'جاري تسجيل الدخول...'
              : 'تسجيل الدخول'}
          </button>
        </form>
      </section>
    </main>
  );
}

interface DashboardPageProps {
  onLogout: () => void;
}

function DashboardPage({
  onLogout,
}: DashboardPageProps) {
  const dashboardQuery = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: getDashboardOverview,
  });

  if (dashboardQuery.isPending) {
    return (
      <main className="state-page">
        <div className="loader" />
        <p>جاري تحميل لوحة التحكم...</p>
      </main>
    );
  }

  if (
    dashboardQuery.isError ||
    !dashboardQuery.data
  ) {
    return (
      <main className="state-page">
        <h2>تعذر تحميل البيانات</h2>

        <p>
          {getErrorMessage(
            dashboardQuery.error,
          )}
        </p>

        <div className="state-buttons">
          <button
            onClick={() =>
              dashboardQuery.refetch()
            }
          >
            إعادة المحاولة
          </button>

          <button
            className="secondary-button"
            onClick={onLogout}
          >
            تسجيل الخروج
          </button>
        </div>
      </main>
    );
  }

  const dashboard = dashboardQuery.data;

  const cards = [
    {
      title: 'إجمالي المتدربين',
      value:
        dashboard.metrics.trainees.total,
      detail: `${dashboard.metrics.trainees.newInPeriod} جديد خلال الفترة`,
      icon: '👥',
    },
    {
      title: 'المجموعات النشطة',
      value:
        dashboard.metrics.training
          .activeGroups,
      detail: `${dashboard.metrics.training.sessionsInPeriod} حصة تدريبية`,
      icon: '⚽',
    },
    {
      title: 'الاشتراكات النشطة',
      value:
        dashboard.metrics.subscriptions
          .active,
      detail: `${dashboard.metrics.subscriptions.pending} اشتراك معلق`,
      icon: '✅',
    },
    {
      title: 'إيرادات الفترة',
      value: formatMoney(
        dashboard.metrics.revenue.amount,
      ),
      detail: `${dashboard.metrics.revenue.paymentsCount} عملية دفع`,
      icon: '💰',
    },
    {
      title: 'المبالغ المستحقة',
      value: formatMoney(
        dashboard.metrics.subscriptions
          .outstandingBalance,
      ),
      detail: `${dashboard.metrics.subscriptions.outstandingCount} اشتراك`,
      icon: '🧾',
    },
    {
      title: 'نسبة الحضور',
      value: `${dashboard.metrics.attendance.rate}%`,
      detail: `${dashboard.metrics.attendance.attended} حاضر من ${dashboard.metrics.attendance.marked}`,
      icon: '📋',
    },
  ];

  const alerts = [
    {
      label:
        'تنتهي خلال 7 أيام',
      value:
        dashboard.alerts
          .expiringNext7Days,
    },
    {
      label: 'اشتراكات منتهية',
      value: dashboard.alerts.expired,
    },
    {
      label:
        'اشتراكات عليها مستحقات',
      value:
        dashboard.alerts.outstanding,
    },
    {
      label: 'مديونيات متأخرة',
      value:
        dashboard.alerts
          .overdueBalances,
    },
  ];

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            H
          </div>

          <div>
            <strong>Haymclub</strong>
            <span>إدارة الأكاديمية</span>
          </div>
        </div>

        <nav>
          <a
            className="nav-link active"
            href="#dashboard"
          >
            <span>▦</span>
            لوحة التحكم
          </a>

          <a
            className="nav-link"
            href="#trainees"
          >
            <span>👥</span>
            المتدربون
          </a>

          <a
            className="nav-link"
            href="#groups"
          >
            <span>⚽</span>
            المجموعات
          </a>

          <a
            className="nav-link"
            href="#subscriptions"
          >
            <span>💳</span>
            الاشتراكات
          </a>

          <a
            className="nav-link"
            href="#attendance"
          >
            <span>✓</span>
            الحضور
          </a>
        </nav>

        <button
          className="logout-button"
          onClick={onLogout}
        >
          تسجيل الخروج
        </button>
      </aside>

      <main
        className="dashboard-content"
        id="dashboard"
      >
        <header className="dashboard-header">
          <div>
            <p className="small-title">
              نظرة عامة
            </p>

            <h1>لوحة التحكم</h1>

            <p className="period">
              من{' '}
              {formatDate(
                dashboard.period.dateFrom,
              )}{' '}
              إلى{' '}
              {formatDate(
                dashboard.period.dateTo,
              )}
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={() =>
              dashboardQuery.refetch()
            }
            disabled={
              dashboardQuery.isFetching
            }
          >
            {dashboardQuery.isFetching
              ? 'جاري التحديث...'
              : 'تحديث البيانات'}
          </button>
        </header>

        <section className="cards-grid">
          {cards.map((card) => (
            <article
              className="stat-card"
              key={card.title}
            >
              <div className="card-icon">
                {card.icon}
              </div>

              <div>
                <p>{card.title}</p>
                <strong>{card.value}</strong>
                <span>{card.detail}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="panels-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="small-title">
                  التنبيهات
                </p>

                <h2>
                  متابعة الاشتراكات
                </h2>
              </div>

              <span className="badge">
                {
                  dashboard.alerts
                    .outstanding
                }{' '}
                تنبيه
              </span>
            </div>

            <div className="alerts-list">
              {alerts.map((alert) => (
                <div
                  className="alert-item"
                  key={alert.label}
                >
                  <span>{alert.label}</span>
                  <strong>
                    {alert.value}
                  </strong>
                </div>
              ))}
            </div>
          </article>

          <article
            className="panel"
            id="attendance"
          >
            <div className="panel-header">
              <div>
                <p className="small-title">
                  الحضور
                </p>

                <h2>
                  معدل حضور المتدربين
                </h2>
              </div>
            </div>

            <div className="attendance-rate">
              <strong>
                {
                  dashboard.metrics
                    .attendance.rate
                }
                %
              </strong>

              <span>نسبة الحضور</span>
            </div>

            <div className="attendance-info">
              <div>
                <span>حاضر</span>
                <strong>
                  {
                    dashboard.metrics
                      .attendance.attended
                  }
                </strong>
              </div>

              <div>
                <span>غياب أو اعتذار</span>
                <strong>
                  {
                    dashboard.metrics
                      .attendance
                      .absentOrExcused
                  }
                </strong>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

function App() {
  const [token, setToken] = useState<
    string | null
  >(() =>
    localStorage.getItem(
      'haymclub_token',
    ),
  );

  const handleLogout = () => {
    localStorage.removeItem(
      'haymclub_token',
    );

    setToken(null);
  };

  if (!token) {
    return (
      <LoginPage
        onSuccess={setToken}
      />
    );
  }

  return (
    <DashboardPage
      onLogout={handleLogout}
    />
  );
}

export default App;
