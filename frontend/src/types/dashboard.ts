import type {
  AcademyRole,
  UserMembership,
  UserProfile,
} from './users';

export interface DashboardOverview {
  generatedAt: string;

  scope: {
    academyId: string;
    branchId: string | null;
  };

  period: {
    dateFrom: string;
    dateTo: string;
  };

  metrics: {
    trainees: {
      total: number;
      newInPeriod: number;
    };

    training: {
      activeGroups: number;
      sessionsInPeriod: number;
    };

    subscriptions: {
      active: number;
      pending: number;
      expired: number;
      outstandingCount: number;
      outstandingBalance: number;
    };

    revenue: {
      amount: number;
      paymentsCount: number;
    };

    attendance: {
      marked: number;
      attended: number;
      absentOrExcused: number;
      rate: number;
    };
  };

  alerts: {
    expiringNext7Days: number;
    expired: number;
    outstanding: number;
    overdueBalances: number;
  };
}

export interface DashboardFilters {
  academyId: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DashboardAcademy {
  id: string;
  name: string;
  slug: string;
  currency?: string;
  status?: string;
  isActive?: boolean;
}

export interface DashboardBranch {
  id: string;
  academyId: string;
  name: string;
  code: string;
  isMain?: boolean;
  isActive?: boolean;
}

export interface DashboardContext {
  currentUser: UserProfile;
  currentMembership?: UserMembership;
  currentRole?: AcademyRole;
  academies: DashboardAcademy[];
  branches: DashboardBranch[];
}
