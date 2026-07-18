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
