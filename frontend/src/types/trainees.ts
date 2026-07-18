export type TraineeGender = 'MALE' | 'FEMALE';

export type TraineeStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'INACTIVE';

export interface TraineeBranch {
  id: string;
  name: string;
  code?: string;
}

export interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
}

export interface TraineeGuardianLink {
  id: string;
  isPrimary?: boolean;
  relationship?: string;
  guardian: Guardian;
}

export interface TrainingGroupSummary {
  id: string;
  name?: string;
  code?: string;
}

export interface TraineeEnrollment {
  id: string;
  status?: string;
  group?: TrainingGroupSummary;
}

export interface Trainee {
  id: string;
  academyId: string;
  branchId: string;
  registrationCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: TraineeGender;
  phone: string | null;
  email: string | null;
  medicalNotes: string | null;
  emergencyNotes: string | null;
  status: TraineeStatus;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  branch?: TraineeBranch;
  guardianLinks?: TraineeGuardianLink[];
  enrollments?: TraineeEnrollment[];
}

export interface AcademyContext {
  academyId?: string;
  branchId?: string;
  academyName?: string;
  branchName?: string;
}

export interface FindTraineesParams {
  q?: string;
  isActive?: boolean;
}

export interface CreateTraineeInput {
  academyId: string;
  branchId: string;
  registrationCode?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: TraineeGender;
  phone?: string;
  email?: string;
  medicalNotes?: string;
  emergencyNotes?: string;
  status?: TraineeStatus;
  isActive?: boolean;
}

export type UpdateTraineeInput = Partial<
  Omit<CreateTraineeInput, 'academyId'>
>;
