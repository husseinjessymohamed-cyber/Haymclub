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

import {
  forgotPassword,
  resetPassword,
} from '../../lib/api';

import './PasswordRecoveryPages.css';

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

function goToLogin(): void {
  window.location.replace(
    window.location.origin,
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] =
    useState('');

  const mutation =
    useMutation({
      mutationFn: () =>
        forgotPassword(email),
    });

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <main
      className="password-recovery-page"
      dir="rtl"
    >
      <section className="password-recovery-card">
        <div className="password-recovery-logo">
          H
        </div>

        <p className="password-recovery-eyebrow">
          Haymclub
        </p>

        <h1>نسيت كلمة المرور؟</h1>

        <p className="password-recovery-description">
          اكتب البريد الإلكتروني المسجل
          وسنرسل إليك رابطًا آمنًا لإنشاء
          كلمة مرور جديدة.
        </p>

        {mutation.isSuccess ? (
          <div className="password-recovery-success">
            <strong>
              تم استلام الطلب
            </strong>

            <p>
              {mutation.data}
            </p>

            <p>
              افحص البريد الوارد ومجلد
              الرسائل غير المرغوب فيها.
            </p>

            <button
              type="button"
              onClick={goToLogin}
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="password-recovery-form"
          >
            <label>
              البريد الإلكتروني

              <input
                type="email"
                value={email}
                autoComplete="email"
                placeholder="name@example.com"
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                required
              />
            </label>

            {mutation.isError && (
              <div className="password-recovery-error">
                {getErrorMessage(
                  mutation.error,
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={
                mutation.isPending
              }
            >
              {mutation.isPending
                ? 'جارٍ إرسال الرابط...'
                : 'إرسال رابط الاستعادة'}
            </button>

            <button
              type="button"
              className="password-recovery-secondary"
              onClick={goToLogin}
            >
              العودة لتسجيل الدخول
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

interface ResetPasswordPageProps {
  token: string;
}

export function ResetPasswordPage({
  token,
}: ResetPasswordPageProps) {
  const [password, setPassword] =
    useState('');

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] = useState('');

  const [
    localError,
    setLocalError,
  ] = useState('');

  const mutation =
    useMutation({
      mutationFn: () =>
        resetPassword(
          token,
          password,
        ),
    });

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();
    setLocalError('');

    if (password.length < 8) {
      setLocalError(
        'كلمة المرور يجب ألا تقل عن 8 أحرف.',
      );
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setLocalError(
        'أضف حرفًا إنجليزيًا كبيرًا على الأقل.',
      );
      return;
    }

    if (!/[a-z]/.test(password)) {
      setLocalError(
        'أضف حرفًا إنجليزيًا صغيرًا على الأقل.',
      );
      return;
    }

    if (!/[0-9]/.test(password)) {
      setLocalError(
        'أضف رقمًا واحدًا على الأقل.',
      );
      return;
    }

    if (
      password !==
      passwordConfirmation
    ) {
      setLocalError(
        'كلمتا المرور غير متطابقتين.',
      );
      return;
    }

    mutation.mutate();
  }

  return (
    <main
      className="password-recovery-page"
      dir="rtl"
    >
      <section className="password-recovery-card">
        <div className="password-recovery-logo">
          H
        </div>

        <p className="password-recovery-eyebrow">
          Haymclub
        </p>

        <h1>إنشاء كلمة مرور جديدة</h1>

        <p className="password-recovery-description">
          اختر كلمة مرور قوية لا تقل عن
          8 أحرف وتحتوي على حرف كبير
          وحرف صغير ورقم.
        </p>

        {mutation.isSuccess ? (
          <div className="password-recovery-success">
            <strong>
              تم تغيير كلمة المرور ✅
            </strong>

            <p>
              {mutation.data}
            </p>

            <button
              type="button"
              onClick={goToLogin}
            >
              تسجيل الدخول الآن
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="password-recovery-form"
          >
            <label>
              كلمة المرور الجديدة

              <input
                type="password"
                value={password}
                autoComplete="new-password"
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                required
              />
            </label>

            <label>
              تأكيد كلمة المرور

              <input
                type="password"
                value={
                  passwordConfirmation
                }
                autoComplete="new-password"
                onChange={(event) =>
                  setPasswordConfirmation(
                    event.target.value,
                  )
                }
                required
              />
            </label>

            {(localError ||
              mutation.isError) && (
              <div className="password-recovery-error">
                {localError ||
                  getErrorMessage(
                    mutation.error,
                  )}
              </div>
            )}

            <button
              type="submit"
              disabled={
                mutation.isPending
              }
            >
              {mutation.isPending
                ? 'جارٍ حفظ كلمة المرور...'
                : 'حفظ كلمة المرور الجديدة'}
            </button>

            <button
              type="button"
              className="password-recovery-secondary"
              onClick={goToLogin}
            >
              إلغاء والعودة
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
