import axios from "axios";

import type { DashboardOverview } from "../types/dashboard";

export const AUTH_TOKEN_KEY = "haymclub_token";

const API_BASE_URL =
  (
    import.meta.env.VITE_API_BASE_URL ||
    "/api"
  ).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    Accept: "application/json",
  },

  timeout: 15000,
});

api.interceptors.request.use((config) => {
  // لا نرسل أي Bearer token إلى مسارات المصادقة العامة.
  const requestUrl = config.url ?? "";

  const isPublicAuthRequest = [
    "/auth/login",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/password-reset",
  ].some((path) => requestUrl.includes(path));

  if (isPublicAuthRequest) {
    if (config.headers) {
      delete config.headers.Authorization;
    }

    return config;
  }

  // HAYMCLUB_CONTEXT_AUTH_TOKEN
  const tokenKey = window.location.hash.includes("super-admin")
    ? "haymclub_super_admin_token"
    : AUTH_TOKEN_KEY;

  const token = localStorage.getItem(tokenKey);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,

  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const requestUrl = error.config?.url ?? "";

      const isPublicAuthRequest = [
        "/auth/login",
        "/auth/forgot-password",
        "/auth/reset-password",
      ].some((path) => requestUrl.includes(path));

      // التوكن منتهي أو أصبح غير صالح بعد تغيير JWT secret.
      if (status === 401 && !isPublicAuthRequest) {
        localStorage.removeItem(
          window.location.hash.includes("super-admin")
            ? "haymclub_super_admin_token"
            : AUTH_TOKEN_KEY,
        );

        // إعادة تحميل التطبيق تجعل App يفتح صفحة تسجيل الدخول.
        window.location.replace(window.location.origin);
      }
    }

    return Promise.reject(error);
  },
);

export const login = async (
  email: string,
  password: string,
): Promise<string> => {
  const response = await api.post("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
  });

  const payload = response.data?.data ?? response.data;

  const token = payload?.accessToken ?? payload?.access_token;

  if (!token || typeof token !== "string") {
    throw new Error("لم يتم استلام رمز تسجيل الدخول من الخادم");
  }

  return token;
};

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  const response = await api.get("/dashboard/overview");

  return response.data?.data ?? response.data;
};

// HAYMCLUB_PASSWORD_RECOVERY_API

function extractAuthMessage(
  payload: unknown,
  fallback: string,
): string {
  if (
    payload &&
    typeof payload === "object"
  ) {
    const record =
      payload as Record<string, unknown>;

    const nested =
      record.data &&
      typeof record.data === "object"
        ? record.data as Record<
            string,
            unknown
          >
        : record;

    if (
      typeof nested.message === "string"
    ) {
      return nested.message;
    }
  }

  return fallback;
}

export const forgotPassword = async (
  email: string,
): Promise<string> => {
  const response = await api.post(
    "/auth/forgot-password",
    {
      email:
        email.trim().toLowerCase(),
    },
  );

  return extractAuthMessage(
    response.data,
    "إذا كان البريد مسجلًا، سيتم إرسال رابط إعادة تعيين كلمة المرور.",
  );
};

export const resetPassword = async (
  token: string,
  password: string,
): Promise<string> => {
  const response = await api.post(
    "/auth/reset-password",
    {
      token: token.trim(),
      password,
    },
  );

  return extractAuthMessage(
    response.data,
    "تم إنشاء كلمة المرور الجديدة بنجاح.",
  );
};

