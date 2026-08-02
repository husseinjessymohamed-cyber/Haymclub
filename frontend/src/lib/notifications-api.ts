import {
  api,
} from './api';

import type {
  AcademyNotification,
  CreateNotificationInput,
} from '../types/notifications';

function unwrap<T>(
  payload: unknown,
): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload
  ) {
    return (
      payload as {
        data: T;
      }
    ).data;
  }

  return payload as T;
}

export async function
getAdminNotifications():
Promise<AcademyNotification[]> {
  const response =
    await api.get(
      '/notifications/admin',
    );

  return unwrap<
    AcademyNotification[]
  >(response.data);
}

export async function
createNotification(
  input: CreateNotificationInput,
): Promise<AcademyNotification> {
  const response =
    await api.post(
      '/notifications',
      input,
    );

  return unwrap<
    AcademyNotification
  >(response.data);
}

export async function
deleteNotification(
  id: string,
): Promise<void> {
  await api.delete(
    `/notifications/${id}`,
  );
}

export async function
getMyNotifications():
Promise<AcademyNotification[]> {
  const response =
    await api.get(
      '/notifications/my',
    );

  return unwrap<
    AcademyNotification[]
  >(response.data);
}

export async function
markNotificationRead(
  id: string,
): Promise<void> {
  await api.patch(
    `/notifications/${id}/read`,
  );
}

export async function
getUnreadNotificationCount():
Promise<number> {
  const response =
    await api.get(
      '/notifications/unread-count',
    );

  const result =
    unwrap<{
      count: number;
    }>(response.data);

  return result.count;
}
