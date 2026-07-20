export type TrainingGroupStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED';

export type TrainingDay =
  | 'SATURDAY'
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY';

export interface BranchOption {
  id: string;
  academyId: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface SportOption {
  id: string;
  academyId?: string;
  name: string;
  code?: string;
  isActive?: boolean;
}

export interface TrainingProgramOption {
  id: string;
  academyId: string;
  sportId: string;
  name: string;
  code: string;
  minimumAge: number | null;
  maximumAge: number | null;
  sessionsPerWeek: number;
  sessionDurationMinutes: number;
  capacity: number | null;
  isActive: boolean;
  sport?: SportOption;
}

export interface CreateTrainingProgramInput {
  academyId: string;
  sportId: string;
  name: string;
  code: string;
  sessionsPerWeek?: number;
  sessionDurationMinutes?: number;
  capacity?: number;
  isActive?: boolean;
}

export interface AcademyMembershipSummary {
  id: string;
  academyId: string | null;
  branchId: string | null;
  role: string;
  isActive: boolean;
}

export interface CoachOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  memberships?: AcademyMembershipSummary[];
}

export interface TrainingGroupSchedule {
  id: string;
  groupId: string;
  dayOfWeek: TrainingDay;
  startTime: string;
  endTime: string;
  venueName: string | null;
  isActive: boolean;
}

export interface TrainingGroup {
  id: string;
  academyId: string;
  branchId: string;
  programId: string;
  coachId: string | null;
  name: string;
  code: string;
  capacity: number;
  status: TrainingGroupStatus;
  notes: string | null;
  isActive: boolean;
  branch?: BranchOption;
  program?: TrainingProgramOption;
  coach?: CoachOption | null;
  schedules?: TrainingGroupSchedule[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateScheduleInput {
  dayOfWeek: TrainingDay;
  startTime: string;
  endTime: string;
  venueName?: string;
  isActive?: boolean;
}

export interface CreateTrainingGroupInput {
  academyId: string;
  branchId: string;
  programId: string;
  coachId?: string | null;
  name: string;
  code: string;
  capacity?: number;
  status?: TrainingGroupStatus;
  notes?: string;
  isActive?: boolean;
  schedules?: CreateScheduleInput[];
}

export type UpdateTrainingGroupInput = Partial<
  Omit<CreateTrainingGroupInput, 'academyId' | 'schedules'>
>;

export interface TrainingGroupFilters {
  branchId?: string;
  programId?: string;
  coachId?: string;
  status?: TrainingGroupStatus;
  isActive?: boolean;
}
