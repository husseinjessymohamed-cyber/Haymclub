import axios from 'axios';

import type { DashboardOverview } from '../types/dashboard';

const getApiBaseUrl = (): string => {
  const hostname = window.location.hostname;

  if (hostname.endsWith('.app.github.dev')) {
    const apiHostname = hostname.replace(
      /-\d+\.app\.github\.dev$/,
      '-3000.app.github.dev',
    );

    return `${window.location.protocol}//${apiHostname}/api`;
  }

  return 'http://localhost:3000/api';
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('haymclub_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const login = async (
  email: string,
  password: string,
): Promise<string> => {
  const response = await api.post('/auth/login', {
    email,
    password,
  });

  const payload = response.data?.data ?? response.data;

  const token =
    payload?.accessToken ??
    payload?.access_token;

  if (!token) {
    throw new Error('لم يتم استلام رمز تسجيل الدخول');
  }

  return token;
};

export const getDashboardOverview =
  async (): Promise<DashboardOverview> => {
    const response = await api.get('/dashboard/overview');

    return response.data?.data ?? response.data;
  };
