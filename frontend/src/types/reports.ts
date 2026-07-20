import type {
  DashboardOverview,
} from './dashboard';

export type ReportsTab =
  | 'summary'
  | 'trainees'
  | 'subscriptions'
  | 'attendance'
  | 'groups';

export type ReportCellValue =
  | string
  | number;

export interface ReportRow {
  id: string;
  values: Record<
    string,
    ReportCellValue
  >;
  searchText: string;
}

export interface ReportsFilters {
  academyId: string;
  branchId?: string;
  dateFrom: string;
  dateTo: string;
}

export interface ReportsSnapshot {
  overview: DashboardOverview;
  trainees: ReportRow[];
  subscriptions: ReportRow[];
  attendance: ReportRow[];
  groups: ReportRow[];
}
