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
  ForgotPasswordPage,
  ResetPasswordPage,
} from './features/auth/PasswordRecoveryPages';

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
  // HAYMCLUB_EMPTY_LOGIN_IDENTIFIER_V2
  const [email, setEmail] =
    useState('');


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
            البريد الإلكتروني أو رقم الهاتف

            <input
              type="text"
              value={email}
              autoComplete="username"
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

        <button
          type="button"
          className="login-forgot-password"
          onClick={() =>
            window.location.assign(
              `${window.location.origin}/?forgotPassword=1`,
            )
          }
        >
          نسيت كلمة المرور؟
        </button>
      </section>
    </main>
  );
}


const HAYMCLUB_APP_VARIANT = (
  import.meta.env.VITE_HAYMCLUB_APP ||
  'web'
).trim().toLowerCase();

function isRoleAllowedForHaymclubApp(
  role: string | null | undefined,
): boolean {
  if (
    HAYMCLUB_APP_VARIANT === 'web'
  ) {
    return true;
  }

  if (
    HAYMCLUB_APP_VARIANT ===
    'superadmin'
  ) {
    return role === 'SUPER_ADMIN';
  }

  if (
    HAYMCLUB_APP_VARIANT ===
    'academy'
  ) {
    return role === 'ACADEMY_ADMIN';
  }

  if (
    HAYMCLUB_APP_VARIANT ===
    'trainee'
  ) {
    return role === 'TRAINEE';
  }

  return false;
}

function haymclubAppTitle(): string {
  if (
    HAYMCLUB_APP_VARIANT ===
    'superadmin'
  ) {
    return 'Haymclub Super Admin';
  }

  if (
    HAYMCLUB_APP_VARIANT ===
    'academy'
  ) {
    return 'Haymclub Academy';
  }

  if (
    HAYMCLUB_APP_VARIANT ===
    'trainee'
  ) {
    return 'Haymclub Trainee';
  }

  return 'Haymclub';
}

function App() {

  const searchParameters =
    new URLSearchParams(
      window.location.search,
    );

  const resetToken =
    searchParameters.get(
      'resetToken',
    );

  const showForgotPassword =
    searchParameters.get(
      'forgotPassword',
    ) === '1';

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


  if (resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
      />
    );
  }

  if (showForgotPassword) {
    return (
      <ForgotPasswordPage />
    );
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
    !isRoleAllowedForHaymclubApp(
      role,
    )
  ) {
    return (
      <main
        dir="rtl"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background:
            'linear-gradient(135deg, #07152b, #0d2d52)',
        }}
      >
        <section
          style={{
            width: '100%',
            maxWidth: '460px',
            padding: '32px',
            borderRadius: '24px',
            background: '#ffffff',
            boxShadow:
              '0 24px 70px rgba(0,0,0,.3)',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              marginTop: 0,
              color: '#0d2d52',
            }}
          >
            {haymclubAppTitle()}
          </h1>

          <p
            style={{
              lineHeight: 1.9,
              color: '#475569',
            }}
          >
            هذا الحساب غير مخصص لهذا التطبيق.
            استخدم تطبيق Haymclub المخصص لنوع حسابك.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '14px',
              border: 0,
              borderRadius: '12px',
              background: '#0d2d52',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            تسجيل الخروج
          </button>
        </section>
      </main>
    );
  }


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
