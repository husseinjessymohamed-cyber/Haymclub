import axios from 'axios';

import { api } from './api';
import { getTrainees } from './trainees-api';
import { getUsers } from './users-api';

import type {
  ClientPortalResponse,
  CreatePortalLinkInput,
  PortalAdminData,
  PortalLink,
  UpdatePortalLinkInput,
} from '../types/portal';

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
    return (data as {
      data: T;
    }).data;
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

function hasClientRole(
  user: UserProfile,
): boolean {
  return (
    user.status === 'ACTIVE' &&
    user.memberships.some(
      (membership) =>
        membership.isActive &&
        (
          membership.role === 'PARENT' ||
          membership.role === 'TRAINEE'
        ),
    )
  );
}

export async function getAuthenticatedProfile():
Promise<UserProfile> {
  const response = await api.get(
    '/auth/me',
  );

  return unwrapResponse<UserProfile>(
    response.data,
  );
}

export async function getPortalAdminData():
Promise<PortalAdminData> {
  const [
    linksResponse,
    users,
    trainees,
  ] = await Promise.all([
    api.get('/portal/links'),
    getUsers(),
    getTrainees(),
  ]);

  return {
    links:
      asArray<PortalLink>(
        unwrapResponse<unknown>(
          linksResponse.data,
        ),
      ),

    users:
      users.filter(
        hasClientRole,
      ),

    trainees,
  };
}

export async function createPortalLink(
  input: CreatePortalLinkInput,
): Promise<PortalLink> {
  const response = await api.post(
    '/portal/links',
    input,
  );

  return unwrapResponse<PortalLink>(
    response.data,
  );
}

export async function updatePortalLink(
  id: string,
  input: UpdatePortalLinkInput,
): Promise<PortalLink> {
  const response = await api.patch(
    `/portal/links/${id}`,
    input,
  );

  return unwrapResponse<PortalLink>(
    response.data,
  );
}

export async function deletePortalLink(
  id: string,
): Promise<void> {
  await api.delete(
    `/portal/links/${id}`,
  );
}

export async function getClientPortal():
Promise<ClientPortalResponse> {
  const response = await api.get(
    '/portal/me',
  );

  return unwrapResponse<ClientPortalResponse>(
    response.data,
  );
}

export function getPortalApiError(
  error: unknown,
): string {
  if (axios.isAxiosError(error)) {
    const data =
      error.response?.data as
        | {
            message?:
              | string
              | string[];

            error?: string;
          }
        | undefined;

    if (
      Array.isArray(
        data?.message,
      )
    ) {
      return data.message.join(
        '، ',
      );
    }

    if (
      typeof data?.message ===
      'string'
    ) {
      return data.message;
    }

    if (
      typeof data?.error ===
      'string'
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
