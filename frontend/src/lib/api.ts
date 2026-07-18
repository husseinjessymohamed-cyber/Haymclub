import axios from 'axios';

import type { DashboardOverview } from '../types/dashboard';

export const AUTH_TOKEN_KEY = 'haymclub_token';

export const api = axios.create({
  // الطلب يذهب إلى Vite على 5173،
  // ثم Vite يمرره داخليًا إلى Backend على 3000.
  baseURL: '/api',

  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },

  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

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
      const requestUrl = error.config?.url ?? '';

      const isLoginRequest =
        requestUrl.includes('/auth/login');

      // التوكن منتهي أو أصبح غير صالح بعد تغيير JWT secret.
      if (status === 401 && !isLoginRequest) {
        localStorage.removeItem(AUTH_TOKEN_KEY);

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
  const response = await api.post('/auth/login', {
    email: email.trim().toLowerCase(),
    password,
  });

  const payload = response.data?.data ?? response.data;

  const token =
    payload?.accessToken ??
    payload?.access_token;

  if (!token || typeof token !== 'string') {
    throw new Error(
      'لم يتم استلام رمز تسجيل الدخول من الخادم',
    );
  }

  return token;
};

export const getDashboardOverview =
  async (): Promise<DashboardOverview> => {
    const response = await api.get('/dashboard/overview');

    return response.data?.data ?? response.data;
  };
