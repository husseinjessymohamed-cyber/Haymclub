export type AcademyRole =
  | 'SUPER_ADMIN'
  | 'ACADEMY_ADMIN'
  | 'BRANCH_MANAGER'
  | 'RECEPTIONIST'
  | 'ACCOUNTANT'
  | 'COACH'
  | 'PARENT'
  | 'TRAINEE';

export interface UserAcademy {
  id: string;
  name: string;
  slug: string;
}

export interface UserBranch {
  id: string;
  academyId?: string;
  name: string;
  code: string;
  isActive?: boolean;
}

export interface UserMembership {
  id: string;
  academyId: string | null;
  branchId: string | null;
  role: AcademyRole;
  isPrimary: boolean;
  isActive: boolean;
  academy: UserAcademy | null;
  branch: UserBranch | null;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  memberships: UserMembership[];
}

export interface AcademyOption {
  id: string;
  name: string;
  slug: string;
  status?: string;
  isActive?: boolean;
}

export interface BranchOption {
  id: string;
  academyId: string;
  name: string;
  code: string;
  isActive?: boolean;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: AcademyRole;
  academyId?: string;
  branchId?: string;
}

export interface UserReferenceData {
  currentUser: UserProfile;
  currentMembership?: UserMembership;
  academies: AcademyOption[];
  branches: BranchOption[];
}
