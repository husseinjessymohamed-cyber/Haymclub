import axios from 'axios';

import { api } from './api';
import {
  getAcademyContext,
  getApiErrorMessage,
} from './trainees-api';

import type {
  BranchOption,
  CoachOption,
  CreateScheduleInput,
  CreateTrainingGroupInput,
  TrainingGroup,
  TrainingGroupFilters,
  TrainingProgramOption,
  UpdateTrainingGroupInput,
} from '../types/groups';

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
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function getTrainingGroups(
  filters: TrainingGroupFilters = {},
): Promise<TrainingGroup[]> {
  const response = await api.get('/training-groups', {
    params: filters,
  });

  return asArray<TrainingGroup>(
    unwrapResponse<unknown>(response.data),
  );
}

export async function createTrainingGroup(
  input: CreateTrainingGroupInput,
): Promise<TrainingGroup> {
  const response = await api.post(
    '/training-groups',
    input,
  );

  return unwrapResponse<TrainingGroup>(response.data);
}

export async function updateTrainingGroup(
  id: string,
  input: UpdateTrainingGroupInput,
): Promise<TrainingGroup> {
  const response = await api.patch(
    `/training-groups/${id}`,
    input,
  );

  return unwrapResponse<TrainingGroup>(response.data);
}

export async function deleteTrainingGroup(
  id: string,
): Promise<void> {
  await api.delete(`/training-groups/${id}`);
}

export async function addTrainingGroupSchedule(
  groupId: string,
  input: CreateScheduleInput,
): Promise<TrainingGroup> {
  const response = await api.post(
    `/training-groups/${groupId}/schedules`,
    input,
  );

  return unwrapResponse<TrainingGroup>(response.data);
}

export async function deleteTrainingGroupSchedule(
  groupId: string,
  scheduleId: string,
): Promise<void> {
  await api.delete(
    `/training-groups/${groupId}/schedules/${scheduleId}`,
  );
}

export async function getGroupOptions(): Promise<{
  academyId?: string;
  academyName?: string;
  branchId?: string;
  branchName?: string;
  branches: BranchOption[];
  programs: TrainingProgramOption[];
  coaches: CoachOption[];
}> {
  const context = await getAcademyContext();

  const [
    branchesResponse,
    programsResponse,
    usersResponse,
  ] = await Promise.all([
    api.get('/branches'),
    api.get('/training-programs', {
      params: {
        isActive: true,
      },
    }),
    api.get('/users'),
  ]);

  const branches = asArray<BranchOption>(
    unwrapResponse<unknown>(
      branchesResponse.data,
    ),
  ).filter((branch) => branch.isActive !== false);

  const programs = asArray<TrainingProgramOption>(
    unwrapResponse<unknown>(
      programsResponse.data,
    ),
  ).filter((program) => program.isActive !== false);

  const users = asArray<CoachOption>(
    unwrapResponse<unknown>(usersResponse.data),
  );

  const coaches = users.filter((user) => {
    if (user.status !== 'ACTIVE') {
      return false;
    }

    return (user.memberships ?? []).some(
      (membership) =>
        membership.role === 'COACH' &&
        membership.isActive !== false &&
        (!context.academyId ||
          membership.academyId ===
            context.academyId),
    );
  });

  return {
    ...context,
    branches,
    programs,
    coaches,
  };
}

export function getGroupsApiError(
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
  }

  return getApiErrorMessage(error);
}
