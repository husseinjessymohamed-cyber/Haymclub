import {
  useMutation,
} from '@tanstack/react-query';

import axios from 'axios';

import {
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import { DashboardPage } from './features/dashboard/DashboardPage';
import {
  AUTH_TOKEN_KEY,
  login,
} from './lib/api';

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
    event: FormEvent<HTMLFormElement>,
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
          سجّل الدخول للوصول إلى لوحة
          التحكم وإدارة بيانات الأكاديمية.
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

  return (
    <DashboardPage
      onLogout={handleLogout}
    />
  );
}

export default App;
