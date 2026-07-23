import type {
  Trainee,
} from './trainees';

import type {
  AcademyRole,
  UserProfile,
} from './users';

export type PortalRelationship =
  | 'SELF'
  | 'PARENT'
  | 'GUARDIAN';

export interface PortalAcademy {
  id: string;
  name: string;
  slug?: string;
  currency?: string;
}

export interface PortalLink {
  id: string;
  academyId: string;
  userId: string;
  traineeId: string;
  relationship: PortalRelationship;
  isPrimary: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  academy?: PortalAcademy;
  user?: UserProfile;
  trainee?: Trainee;
}

export interface CreatePortalLinkInput {
  userId: string;
  traineeId: string;
  relationship: PortalRelationship;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface UpdatePortalLinkInput {
  relationship?: PortalRelationship;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface PortalAdminData {
  links: PortalLink[];
  users: UserProfile[];
  trainees: Trainee[];
}

export interface TraineePortalCredentials {
  email: string;
  password: string;
}

export interface CreateTraineePortalLinkResponse {
  link: PortalLink;
  credentials: TraineePortalCredentials;
}

export interface PortalAttendanceSummary {
  trainee: {
    id: string;
    registrationCode: string;
    firstName: string;
    lastName: string;
  };

  totalSessions: number;
  markedSessions: number;
  attendanceRate: number;

  counts: {
    NOT_MARKED: number;
    PRESENT: number;
    ABSENT: number;
    LATE: number;
    EXCUSED: number;
  };
}

export interface ClientPortalTrainee {
  link: {
    id: string;
    relationship: PortalRelationship;
    isPrimary: boolean;
  };

  trainee: Trainee;
  enrollments: unknown[];
  attendance: PortalAttendanceSummary;
  billing: Record<string, unknown>;
}

export interface ClientPortalResponse {
  generatedAt: string;
  user: UserProfile;

  activeMembership: {
    academyId: string | null;
    branchId: string | null;
    role: AcademyRole;
  };

  trainees: ClientPortalTrainee[];
}
