export type NotificationAudience =
  | 'ALL_TRAINEES'
  | 'BRANCH_TRAINEES';

export interface AcademyNotification {
  id: string;
  academyId?: string;
  branchId: string | null;
  senderUserId?: string;
  title: string;
  body: string;
  audience: NotificationAudience;
  publishedAt: string;
  createdAt: string;
  isRead?: boolean;
}

export interface CreateNotificationInput {
  title: string;
  body: string;
  audience: NotificationAudience;
  branchId?: string;
}
