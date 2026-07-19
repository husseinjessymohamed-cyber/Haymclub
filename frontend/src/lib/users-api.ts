import axios from 'axios';

import { api } from './api';

import type {
  AcademyOption,
  BranchOption,
  CreateUserInput,
  UserProfile,
  UserReferenceData,
} from '../types/users';

function unwrapResponse<T>(data: unknown): T {
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data
  ) {
    return (data as { data: T }).data;
  }

  return data as T;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value)
    ? (value as T[])
    : [];
}

export async function getUsers():
Promise<UserProfile[]> {
  const response = await api.get('/users');

  return asArray<UserProfile>(
    unwrapResponse<unknown>(response.data),
  );
}

export async function getUser(
  id: string,
): Promise<UserProfile> {
  const response = await api.get(
    `/users/${id}`,
  );

  return unwrapResponse<UserProfile>(
    response.data,
  );
}

export async function createUser(
  input: CreateUserInput,
): Promise<UserProfile> {
  const response = await api.post(
    '/users',
    input,
  );

  return unwrapResponse<UserProfile>(
    response.data,
  );
}

export async function getUserReferenceData():
Promise<UserReferenceData> {
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

    academies:
      asArray<AcademyOption>(
        unwrapResponse<unknown>(
          academiesResponse.data,
        ),
      ),

    branches:
      asArray<BranchOption>(
        unwrapResponse<unknown>(
          branchesResponse.data,
        ),
      ),
  };
}

export function getUsersApiError(
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

    if (typeof data?.message === 'string') {
      return data.message;
    }

    if (typeof data?.error === 'string') {
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
