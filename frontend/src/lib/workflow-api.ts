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

export async function submitWorkflowFeedbackWithFile(
  input: SubmitWorkflowFeedbackInput,
  attachment?: File | null,
): Promise<unknown> {
  const formData = new FormData();

  if (input.type) {
    formData.append(
      'type',
      input.type,
    );
  }

  if (input.subject) {
    formData.append(
      'subject',
      input.subject,
    );
  }

  formData.append(
    'message',
    input.message,
  );

  if (input.entityType) {
    formData.append(
      'entityType',
      input.entityType,
    );
  }

  if (input.entityId) {
    formData.append(
      'entityId',
      input.entityId,
    );
  }

  if (input.metadata) {
    formData.append(
      'metadata',
      JSON.stringify(
        input.metadata,
      ),
    );
  }

  if (attachment) {
    formData.append(
      'attachment',
      attachment,
    );
  }

  const response = await api.post(
    '/workflow/feedback/upload',
    formData,
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

export async function getAcademyWorkflowFeedback():
Promise<WorkflowFeedback[]> {
  const response = await api.get(
    '/workflow/feedback/admin',
  );

  return unwrap<WorkflowFeedback[]>(
    response.data,
  );
}

export async function getWorkflowFeedbackAttachment(
  feedbackId: string,
): Promise<Blob> {
  const response = await api.get(
    `/workflow/feedback/${feedbackId}/attachment`,
    {
      responseType: 'blob',
    },
  );

  return response.data as Blob;
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
