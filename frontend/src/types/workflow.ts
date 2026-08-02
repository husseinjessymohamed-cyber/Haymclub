export type WorkflowStatus =
  | 'PENDING'
  | 'READY'
  | 'IN_PROGRESS'
  | 'WAITING_FEEDBACK'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'ESCALATED';

export interface WorkflowTask {
  id: string;
  academy_id: string | null;
  branch_id: string | null;
  entity_type: string;
  entity_id: string | null;
  task_type: string;
  title: string;
  description: string | null;
  status: WorkflowStatus;
  priority: string;
  assigned_role: string | null;
  assigned_user_id: string | null;
  parent_task_id: string | null;
  blocked_by_task_id: string | null;
  blocker_title?: string | null;
  blocker_status?: WorkflowStatus | null;
  parent_title?: string | null;
  next_route: string | null;
  due_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown> | null;
  feedback_count?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowFeedback {
  id: string;
  academy_id: string | null;
  branch_id: string | null;
  feedback_type: string;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  task_status?: WorkflowStatus | null;
  task_title?: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface SubmitWorkflowFeedbackInput {
  type?: string;
  subject?: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}
