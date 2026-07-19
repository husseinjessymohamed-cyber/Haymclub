import axios from 'axios';

import { api } from './api';

import type {
  DashboardAcademy,
  DashboardBranch,
  DashboardContext,
  DashboardFilters,
  DashboardOverview,
} from '../types/dashboard';

import type {
  UserProfile,
} from '../types/users';

function unwrapResponse<T>(
  data: unknown,
): T {
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data
  ) {
    return (data as { data: T }).data;
  }

  return data as T;
}

function asArray<T>(
  value: unknown,
): T[] {
  return Array.isArray(value)
    ? (value as T[])
    : [];
}

export async function getDashboardContext():
Promise<DashboardContext> {
  const [
    meResponse,
    academiesResponse,
    branchesResponse,
  ] = await Promise.all([
    api.get('/auth/me'),
    api.get('/academies'),
    api.get('/branches'),
  ]);

  const currentUser =
    unwrapResponse<UserProfile>(
      meResponse.data,
    );

  const currentMembership =
    currentUser.memberships?.find(
      (membership) =>
        membership.isPrimary &&
        membership.isActive,
    ) ??
    currentUser.memberships?.find(
      (membership) =>
        membership.isActive,
    );

  return {
    currentUser,
    currentMembership,
    currentRole:
      currentMembership?.role,

    academies:
      asArray<DashboardAcademy>(
        unwrapResponse<unknown>(
          academiesResponse.data,
        ),
      ),

    branches:
      asArray<DashboardBranch>(
        unwrapResponse<unknown>(
          branchesResponse.data,
        ),
      ),
  };
}

export async function getDashboardOverview(
  filters: DashboardFilters,
): Promise<DashboardOverview> {
  const response = await api.get(
    '/dashboard/overview',
    {
      params: filters,
    },
  );

  return unwrapResponse<DashboardOverview>(
    response.data,
  );
}

export function getDashboardApiError(
  error: unknown,
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string | string[];
          error?: string;
        }
      | undefined;

    if (Array.isArray(data?.message)) {
      return data.message.join('، ');
    }

    if (
      typeof data?.message === 'string'
    ) {
      return data.message;
    }

    if (
      typeof data?.error === 'string'
    ) {
      return data.error;
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
