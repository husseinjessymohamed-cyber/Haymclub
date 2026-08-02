import axios from 'axios';

import { api } from './api';

import type {
  SubmitWorkflowFeedbackInput,
  WorkflowFeedback,
  WorkflowStatus,
  WorkflowTask,
} from '../types/workflow';

function unwrap<T>(value: unknown): T {
  if (
    value &&
    typeof value === 'object' &&
    'data' in value
  ) {
    return (value as { data: T }).data;
  }

  return value as T;
}

export async function getWorkflowTasks(
  status?: WorkflowStatus | '',
): Promise<WorkflowTask[]> {
  const response = await api.get(
    '/workflow/tasks',
    {
      params: status
        ? { status }
        : undefined,
    },
  );

  return unwrap<WorkflowTask[]>(
    response.data,
  );
}

export async function synchronizeWorkflow():
Promise<WorkflowTask[]> {
  const response = await api.post(
    '/workflow/sync',
  );

  return unwrap<WorkflowTask[]>(
    response.data,
  );
}

export async function updateWorkflowTaskStatus(
  taskId: string,
  status: WorkflowStatus,
  failureReason?: string,
): Promise<WorkflowTask> {
  const response = await api.patch(
    `/workflow/tasks/${taskId}/status`,
    {
      status,
      failureReason:
        failureReason || undefined,
    },
  );

  return unwrap<WorkflowTask>(
    response.data,
  );
}

export async function escalateWorkflowTask(
  taskId: string,
  reason?: string,
): Promise<WorkflowTask> {
  const response = await api.post(
    `/workflow/tasks/${taskId}/escalate`,
    {
      reason: reason || undefined,
    },
  );

  return unwrap<WorkflowTask>(
    response.data,
  );
}

export async function submitWorkflowFeedback(
  input: SubmitWorkflowFeedbackInput,
): Promise<unknown> {
  const response = await api.post(
    '/workflow/feedback',
    input,
  );

  return unwrap<unknown>(
    response.data,
  );
}

export async function getMyWorkflowFeedback():
Promise<WorkflowFeedback[]> {
  const response = await api.get(
    '/workflow/my-feedback',
  );

  return unwrap<WorkflowFeedback[]>(
    response.data,
  );
}

export async function resolveWorkflowFeedback(
  feedbackId: string,
  responseText: string,
): Promise<WorkflowFeedback> {
  const response = await api.patch(
    `/workflow/feedback/${feedbackId}/resolve`,
    {
      response: responseText,
    },
  );

  return unwrap<WorkflowFeedback>(
    response.data,
  );
}

export function getWorkflowApiError(
  error: unknown,
): string {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join('، ');
    }

    if (typeof message === 'string') {
      return message;
    }

    if (!error.response) {
      return 'تعذر الاتصال بالخادم';
    }

    return `فشل الطلب برمز ${error.response.status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'حدث خطأ غير متوقع';
}
