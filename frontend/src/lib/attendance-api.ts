import axios from 'axios';

import { api } from './api';
import {
  getGroupOptions,
  getGroupsApiError,
  getTrainingGroups,
} from './groups-api';

import type {
  CreateTrainingSessionInput,
  MarkAttendanceRecordInput,
  TraineeAttendanceStats,
  TrainingSession,
  TrainingSessionFilters,
  UpdateTrainingSessionInput,
} from '../types/attendance';

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

export async function getAttendanceOptions() {
  const [options, groups] = await Promise.all([
    getGroupOptions(),

    getTrainingGroups({
      isActive: true,
    }),
  ]);

  return {
    ...options,
    groups,
  };
}

export async function getAttendanceSessions(
  filters: TrainingSessionFilters = {},
): Promise<TrainingSession[]> {
  const response = await api.get(
    '/attendance/sessions',
    {
      params: filters,
    },
  );

  return asArray<TrainingSession>(
    unwrapResponse<unknown>(response.data),
  );
}

export async function getAttendanceSession(
  id: string,
): Promise<TrainingSession> {
  const response = await api.get(
    `/attendance/sessions/${id}`,
  );

  return unwrapResponse<TrainingSession>(
    response.data,
  );
}

export async function createAttendanceSession(
  input: CreateTrainingSessionInput,
): Promise<TrainingSession> {
  const response = await api.post(
    '/attendance/sessions',
    input,
  );

  return unwrapResponse<TrainingSession>(
    response.data,
  );
}

export async function updateAttendanceSession(
  id: string,
  input: UpdateTrainingSessionInput,
): Promise<TrainingSession> {
  const response = await api.patch(
    `/attendance/sessions/${id}`,
    input,
  );

  return unwrapResponse<TrainingSession>(
    response.data,
  );
}

export async function markSessionAttendance(
  sessionId: string,
  records: MarkAttendanceRecordInput[],
): Promise<TrainingSession> {
  const response = await api.post(
    `/attendance/sessions/${sessionId}/records`,
    {
      records,
    },
  );

  return unwrapResponse<TrainingSession>(
    response.data,
  );
}

export async function deleteAttendanceSession(
  sessionId: string,
): Promise<void> {
  await api.delete(
    `/attendance/sessions/${sessionId}`,
  );
}

export async function getTraineeAttendanceStats(
  traineeId: string,
): Promise<TraineeAttendanceStats> {
  const response = await api.get(
    `/attendance/trainees/${traineeId}/stats`,
  );

  return unwrapResponse<TraineeAttendanceStats>(
    response.data,
  );
}

export function getAttendanceApiError(
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

  return getGroupsApiError(error);
}
