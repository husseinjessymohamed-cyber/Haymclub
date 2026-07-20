import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import axios from 'axios';

import {
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import {
  DashboardPage,
} from './features/dashboard/DashboardPage';

import {
  ClientPortalPage,
} from './features/portal/ClientPortalPage';

import {
  AUTH_TOKEN_KEY,
  login,
} from './lib/api';

import {
  getAuthenticatedProfile,
} from './lib/portal-api';

import type {
  UserProfile,
} from './types/users';

import './App.css';

function getErrorMessage(
  error: unknown,
): string {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join('، ');
    }

    if (
      typeof message === 'string'
    ) {
      return message;
    }

    if (!error.response) {
      return 'تعذر الاتصال بالخادم';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'حدث خطأ غير متوقع';
}

function activeRole(
  profile: UserProfile,
): string | undefined {
  const memberships =
    profile.memberships ?? [];

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
  )?.role;
}

interface LoginPageProps {
  onSuccess: (
    token: string,
  ) => void;
}

function LoginPage({
  onSuccess,
}: LoginPageProps) {
  const [email, setEmail] =
    useState(
      'admin@haymclub.com',
    );

  const [password, setPassword] =
    useState('');

  const loginMutation =
    useMutation({
      mutationFn: () =>
        login(email, password),

      onSuccess: (token) => {
        localStorage.setItem(
          AUTH_TOKEN_KEY,
          token,
        );

        onSuccess(token);
      },
    });

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();
    loginMutation.mutate();
  }

  return (
    <main
      className="login-page"
      dir="rtl"
    >
      <section className="login-card">
        <div className="brand-logo">
          H
        </div>

        <p className="small-title">
          منصة إدارة الأكاديميات
        </p>

        <h1>Haymclub</h1>

        <p className="description">
          سجّل الدخول للوصول إلى حسابك
          وإدارة أو متابعة بيانات
          الأكاديمية.
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
              autoComplete="email"
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
              autoComplete="current-password"
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
              ? 'جارٍ تسجيل الدخول...'
              : 'تسجيل الدخول'}
          </button>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [token, setToken] =
    useState<string | null>(
      () =>
        localStorage.getItem(
          AUTH_TOKEN_KEY,
        ),
    );

  const profileQuery = useQuery({
    queryKey: [
      'authenticated-profile',
      token,
    ],

    queryFn:
      getAuthenticatedProfile,

    enabled:
      Boolean(token),

    staleTime: 60_000,
  });

  function handleLogout(): void {
    localStorage.removeItem(
      AUTH_TOKEN_KEY,
    );

    window.location.hash = '';
    setToken(null);
  }

  if (!token) {
    return (
      <LoginPage
        onSuccess={setToken}
      />
    );
  }

  if (profileQuery.isPending) {
    return (
      <main
        className="state-page"
        dir="rtl"
      >
        <div className="loader" />

        <h1>
          جارٍ فتح الحساب
        </h1>
      </main>
    );
  }

  if (
    profileQuery.isError ||
    !profileQuery.data
  ) {
    return (
      <main
        className="state-page"
        dir="rtl"
      >
        <h1>
          تعذر تحميل الحساب
        </h1>

        <p>
          {getErrorMessage(
            profileQuery.error,
          )}
        </p>

        <div className="state-buttons">
          <button
            type="button"
            onClick={() =>
              void profileQuery.refetch()
            }
          >
            إعادة المحاولة
          </button>

          <button
            type="button"
            onClick={handleLogout}
          >
            تسجيل الخروج
          </button>
        </div>
      </main>
    );
  }

  const role =
    activeRole(
      profileQuery.data,
    );

  if (
    role === 'PARENT' ||
    role === 'TRAINEE'
  ) {
    return (
      <ClientPortalPage
        onLogout={handleLogout}
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
