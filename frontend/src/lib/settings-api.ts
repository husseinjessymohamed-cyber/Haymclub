import axios from 'axios';

import { api } from './api';

import type {
  Academy,
  Branch,
  CreateAcademyInput,
  CreateBranchInput,
  CreateSportInput,
  CreateTrainingProgramInput,
  SettingsBootstrap,
  Sport,
  TrainingProgram,
  UpdateAcademyInput,
  UpdateBranchInput,
  UpdateSportInput,
  UpdateTrainingProgramInput,
} from '../types/settings';

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

export async function getSettingsBootstrap():
Promise<SettingsBootstrap> {
  const [
    meResponse,
    academiesResponse,
    branchesResponse,
    sportsResponse,
    programsResponse,
  ] = await Promise.all([
    api.get('/auth/me'),
    api.get('/academies'),
    api.get('/branches'),
    api.get('/sports'),
    api.get('/training-programs'),
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
      asArray<Academy>(
        unwrapResponse<unknown>(
          academiesResponse.data,
        ),
      ),

    branches:
      asArray<Branch>(
        unwrapResponse<unknown>(
          branchesResponse.data,
        ),
      ),

    sports:
      asArray<Sport>(
        unwrapResponse<unknown>(
          sportsResponse.data,
        ),
      ),

    programs:
      asArray<TrainingProgram>(
        unwrapResponse<unknown>(
          programsResponse.data,
        ),
      ),
  };
}

export async function createAcademy(
  input: CreateAcademyInput,
): Promise<Academy> {
  const response = await api.post(
    '/academies',
    input,
  );

  return unwrapResponse<Academy>(
    response.data,
  );
}

export async function updateAcademy(
  id: string,
  input: UpdateAcademyInput,
): Promise<Academy> {
  const response = await api.patch(
    `/academies/${id}`,
    input,
  );

  return unwrapResponse<Academy>(
    response.data,
  );
}

export async function deleteAcademy(
  id: string,
): Promise<void> {
  await api.delete(`/academies/${id}`);
}

export async function createBranch(
  input: CreateBranchInput,
): Promise<Branch> {
  const response = await api.post(
    '/branches',
    input,
  );

  return unwrapResponse<Branch>(
    response.data,
  );
}

export async function updateBranch(
  id: string,
  input: UpdateBranchInput,
): Promise<Branch> {
  const response = await api.patch(
    `/branches/${id}`,
    input,
  );

  return unwrapResponse<Branch>(
    response.data,
  );
}

export async function deleteBranch(
  id: string,
): Promise<void> {
  await api.delete(`/branches/${id}`);
}

export async function createSport(
  input: CreateSportInput,
): Promise<Sport> {
  const response = await api.post(
    '/sports',
    input,
  );

  return unwrapResponse<Sport>(
    response.data,
  );
}

export async function updateSport(
  id: string,
  input: UpdateSportInput,
): Promise<Sport> {
  const response = await api.patch(
    `/sports/${id}`,
    input,
  );

  return unwrapResponse<Sport>(
    response.data,
  );
}

export async function deleteSport(
  id: string,
): Promise<void> {
  await api.delete(`/sports/${id}`);
}

export async function createProgram(
  input: CreateTrainingProgramInput,
): Promise<TrainingProgram> {
  const response = await api.post(
    '/training-programs',
    input,
  );

  return unwrapResponse<TrainingProgram>(
    response.data,
  );
}

export async function updateProgram(
  id: string,
  input: UpdateTrainingProgramInput,
): Promise<TrainingProgram> {
  const response = await api.patch(
    `/training-programs/${id}`,
    input,
  );

  return unwrapResponse<TrainingProgram>(
    response.data,
  );
}

export async function deleteProgram(
  id: string,
): Promise<void> {
  await api.delete(
    `/training-programs/${id}`,
  );
}

export function getSettingsApiError(
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
