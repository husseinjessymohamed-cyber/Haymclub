import axios from 'axios';

import { api } from './api';

import type {
  AcademyContext,
  CreateTraineeInput,
  FindTraineesParams,
  Trainee,
  UpdateTraineeInput,
} from '../types/trainees';

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

export async function getAcademyContext(): Promise<AcademyContext> {
  const response = await api.get('/auth/me');
  const payload = unwrapResponse<Record<string, unknown>>(
    response.data,
  );

  const user =
    typeof payload.user === 'object' &&
    payload.user !== null
      ? (payload.user as Record<string, unknown>)
      : payload;

  const directMembership =
    typeof payload.activeMembership === 'object' &&
    payload.activeMembership !== null
      ? (payload.activeMembership as Record<string, unknown>)
      : null;

  const userMembership =
    typeof user.activeMembership === 'object' &&
    user.activeMembership !== null
      ? (user.activeMembership as Record<string, unknown>)
      : null;

  const memberships = Array.isArray(user.memberships)
    ? (user.memberships as Array<Record<string, unknown>>)
    : [];

  const primaryMembership =
    directMembership ??
    userMembership ??
    memberships.find(
      (membership) =>
        membership.isPrimary === true &&
        membership.isActive !== false,
    ) ??
    memberships.find(
      (membership) => membership.isActive !== false,
    );

  const academy =
    primaryMembership &&
    typeof primaryMembership.academy === 'object' &&
    primaryMembership.academy !== null
      ? (primaryMembership.academy as Record<string, unknown>)
      : null;

  const branch =
    primaryMembership &&
    typeof primaryMembership.branch === 'object' &&
    primaryMembership.branch !== null
      ? (primaryMembership.branch as Record<string, unknown>)
      : null;

  return {
    academyId:
      String(
        payload.academyId ??
          user.academyId ??
          primaryMembership?.academyId ??
          '',
      ) || undefined,

    branchId:
      String(
        payload.branchId ??
          user.branchId ??
          primaryMembership?.branchId ??
          '',
      ) || undefined,

    academyName:
      typeof academy?.name === 'string'
        ? academy.name
        : undefined,

    branchName:
      typeof branch?.name === 'string'
        ? branch.name
        : undefined,
  };
}

export async function getTrainees(
  params: FindTraineesParams = {},
): Promise<Trainee[]> {
  const response = await api.get('/trainees', {
    params,
  });

  const result = unwrapResponse<unknown>(response.data);

  return Array.isArray(result)
    ? (result as Trainee[])
    : [];
}

export async function createTrainee(
  input: CreateTraineeInput,
): Promise<Trainee> {
  const response = await api.post('/trainees', input);

  return unwrapResponse<Trainee>(response.data);
}

export async function updateTrainee(
  id: string,
  input: UpdateTraineeInput,
): Promise<Trainee> {
  const response = await api.patch(
    `/trainees/${id}`,
    input,
  );

  return unwrapResponse<Trainee>(response.data);
}

export async function enrollTraineeInGroup(
  traineeId: string,
  groupId: string,
): Promise<unknown> {
  const response = await api.post(
    `/trainees/${traineeId}/enrollments`,
    {
      groupId,
    },
  );

  return unwrapResponse<unknown>(
    response.data,
  );
}

export async function deleteTrainee(
  id: string,
): Promise<void> {
  await api.delete(`/trainees/${id}`);
}

export function getApiErrorMessage(
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
