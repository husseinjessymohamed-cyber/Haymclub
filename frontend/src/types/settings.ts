import type {
  AcademyRole,
  UserMembership,
  UserProfile,
} from './users';

export type AcademyStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'SUSPENDED';

export type TrainingLevel =
  | 'ALL_LEVELS'
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'ADVANCED'
  | 'PROFESSIONAL';

export interface Academy {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  timezone: string;
  currency: string;
  status: AcademyStatus;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Branch {
  id: string;
  academyId: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  governorate: string | null;
  city: string | null;
  isMain: boolean;
  isActive: boolean;
  academy?: Academy;
  createdAt?: string;
  updatedAt?: string;
}

export interface Sport {
  id: string;
  academyId: string;
  name: string;
  code: string;
  description: string | null;
  minimumAge: number | null;
  maximumAge: number | null;
  isActive: boolean;
  academy?: Academy;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingProgram {
  id: string;
  academyId: string;
  sportId: string;
  name: string;
  code: string;
  description: string | null;
  level: TrainingLevel;
  minimumAge: number | null;
  maximumAge: number | null;
  sessionsPerWeek: number;
  sessionDurationMinutes: number;
  capacity: number | null;
  isActive: boolean;
  sport?: Sport;
  academy?: Academy;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAcademyInput {
  name: string;
  slug: string;
  legalName?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  timezone?: string;
  currency?: string;
  status?: AcademyStatus;
  isActive?: boolean;
}

export type UpdateAcademyInput =
  Partial<CreateAcademyInput>;

export interface CreateBranchInput {
  academyId: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  governorate?: string;
  city?: string;
  isMain?: boolean;
  isActive?: boolean;
}

export type UpdateBranchInput = Partial<
  Omit<CreateBranchInput, 'academyId'>
>;

export interface CreateSportInput {
  academyId: string;
  name: string;
  code: string;
  description?: string;
  minimumAge?: number;
  maximumAge?: number;
  isActive?: boolean;
}

export type UpdateSportInput = Partial<
  Omit<CreateSportInput, 'academyId'>
>;

export interface CreateTrainingProgramInput {
  academyId: string;
  sportId: string;
  name: string;
  code: string;
  description?: string;
  level?: TrainingLevel;
  minimumAge?: number;
  maximumAge?: number;
  sessionsPerWeek?: number;
  sessionDurationMinutes?: number;
  capacity?: number;
  isActive?: boolean;
}

export type UpdateTrainingProgramInput =
  Partial<
    Omit<
      CreateTrainingProgramInput,
      'academyId' | 'sportId'
    >
  >;

export interface SettingsBootstrap {
  currentUser: UserProfile;
  currentMembership?: UserMembership;
  currentRole?: AcademyRole;
  academies: Academy[];
  branches: Branch[];
  sports: Sport[];
  programs: TrainingProgram[];
}
