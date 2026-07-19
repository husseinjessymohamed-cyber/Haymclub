import type {
  CoachOption,
  TrainingGroup,
} from './groups';

export type TrainingSessionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type AttendanceStatus =
  | 'NOT_MARKED'
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'EXCUSED';

export interface AttendanceTrainee {
  id: string;
  registrationCode: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
}

export interface AttendanceRecord {
  id: string;
  academyId: string;
  sessionId: string;
  traineeId: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  notes: string | null;
  trainee?: AttendanceTrainee;
}

export interface TrainingSession {
  id: string;
  academyId: string;
  branchId: string;
  groupId: string;
  coachId: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  venueName: string | null;
  status: TrainingSessionStatus;
  notes: string | null;
  isActive: boolean;
  group?: TrainingGroup;
  coach?: CoachOption | null;
  attendanceRecords?: AttendanceRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTrainingSessionInput {
  academyId: string;
  branchId: string;
  groupId: string;
  coachId?: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  venueName?: string;
  notes?: string;
  generateRoster?: boolean;
}

export interface UpdateTrainingSessionInput {
  coachId?: string | null;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  venueName?: string;
  notes?: string;
  status?: TrainingSessionStatus;
  isActive?: boolean;
}

export interface TrainingSessionFilters {
  branchId?: string;
  groupId?: string;
  coachId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: TrainingSessionStatus;
}

export interface MarkAttendanceRecordInput {
  traineeId: string;
  status: AttendanceStatus;
  checkInAt?: string;
  notes?: string;
}

export interface TraineeAttendanceStats {
  trainee: {
    id: string;
    registrationCode: string;
    firstName: string;
    lastName: string;
  };
  totalSessions: number;
  markedSessions: number;
  attendanceRate: number;
  counts: Record<AttendanceStatus, number>;
}
