import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { BillingService } from '../billing/billing.service';

export interface DashboardFilters {
  academyId: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface DashboardPeriod {
  dateFrom: string;
  dateTo: string;
  toExclusiveDate: string;
}

interface DashboardRawMetrics {
  total_trainees?: string | number;
  new_trainees?: string | number;
  active_groups?: string | number;
  sessions_count?: string | number;
  active_subscriptions?: string | number;
  pending_subscriptions?: string | number;
  expired_subscriptions?: string | number;
  outstanding_count?: string | number;
  outstanding_balance?: string | number;
  payments_count?: string | number;
  revenue_amount?: string | number;
  marked_attendance?: string | number;
  attended?: string | number;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly billingService: BillingService,
  ) {}

  async getOverview(filters: DashboardFilters) {
    const period = this.resolvePeriod(filters.dateFrom, filters.dateTo);

    await this.billingService.syncSubscriptionStatuses(
      filters.academyId,
      filters.branchId,
    );

    const rows = await this.dataSource.query<DashboardRawMetrics[]>(
      `
        WITH trainee_metrics AS (
          SELECT
            COUNT(*) FILTER (
              WHERE is_active = TRUE
              AND deleted_at IS NULL
            ) AS total_trainees,

            COUNT(*) FILTER (
              WHERE is_active = TRUE
              AND deleted_at IS NULL
              AND created_at >= $3::date
              AND created_at < $5::date
            ) AS new_trainees

          FROM trainees
          WHERE academy_id = $1::uuid
          AND (
            $2::uuid IS NULL
            OR branch_id = $2::uuid
          )
        ),

        group_metrics AS (
          SELECT
            COUNT(*) FILTER (
              WHERE is_active = TRUE
              AND deleted_at IS NULL
            ) AS active_groups

          FROM training_groups
          WHERE academy_id = $1::uuid
          AND (
            $2::uuid IS NULL
            OR branch_id = $2::uuid
          )
        ),

        subscription_metrics AS (
          SELECT
            COUNT(*) FILTER (
              WHERE status = 'ACTIVE'
              AND deleted_at IS NULL
            ) AS active_subscriptions,

            COUNT(*) FILTER (
              WHERE status = 'PENDING'
              AND deleted_at IS NULL
            ) AS pending_subscriptions,

            COUNT(*) FILTER (
              WHERE status = 'EXPIRED'
              AND deleted_at IS NULL
            ) AS expired_subscriptions,

            COUNT(*) FILTER (
              WHERE balance_amount > 0
              AND status != 'CANCELLED'
              AND deleted_at IS NULL
            ) AS outstanding_count,

            COALESCE(
              SUM(balance_amount) FILTER (
                WHERE balance_amount > 0
                AND status != 'CANCELLED'
                AND deleted_at IS NULL
              ),
              0
            ) AS outstanding_balance

          FROM trainee_subscriptions
          WHERE academy_id = $1::uuid
          AND (
            $2::uuid IS NULL
            OR branch_id = $2::uuid
          )
        ),

        payment_metrics AS (
          SELECT
            COUNT(*) FILTER (
              WHERE deleted_at IS NULL
            ) AS payments_count,

            COALESCE(
              SUM(amount) FILTER (
                WHERE deleted_at IS NULL
              ),
              0
            ) AS revenue_amount

          FROM payments
          WHERE academy_id = $1::uuid
          AND (
            $2::uuid IS NULL
            OR branch_id = $2::uuid
          )
          AND paid_at >= $3::date
          AND paid_at < $5::date
        ),

        session_metrics AS (
          SELECT
            COUNT(*) FILTER (
              WHERE deleted_at IS NULL
              AND status != 'CANCELLED'
            ) AS sessions_count

          FROM training_sessions
          WHERE academy_id = $1::uuid
          AND (
            $2::uuid IS NULL
            OR branch_id = $2::uuid
          )
          AND session_date >= $3::date
          AND session_date <= $4::date
        ),

        attendance_metrics AS (
          SELECT
            COUNT(*) FILTER (
              WHERE attendance.status != 'NOT_MARKED'
              AND attendance.deleted_at IS NULL
            ) AS marked_attendance,

            COUNT(*) FILTER (
              WHERE attendance.status IN (
                'PRESENT',
                'LATE'
              )
              AND attendance.deleted_at IS NULL
            ) AS attended

          FROM attendance_records attendance

          INNER JOIN training_sessions session
            ON session.id =
              attendance.session_id

          WHERE attendance.academy_id =
            $1::uuid

          AND (
            $2::uuid IS NULL
            OR session.branch_id = $2::uuid
          )

          AND session.session_date >=
            $3::date

          AND session.session_date <=
            $4::date

          AND session.status !=
            'CANCELLED'

          AND session.deleted_at IS NULL
        )

        SELECT
          trainee_metrics.*,
          group_metrics.*,
          subscription_metrics.*,
          payment_metrics.*,
          session_metrics.*,
          attendance_metrics.*

        FROM trainee_metrics
        CROSS JOIN group_metrics
        CROSS JOIN subscription_metrics
        CROSS JOIN payment_metrics
        CROSS JOIN session_metrics
        CROSS JOIN attendance_metrics
        `,
      [
        filters.academyId,
        filters.branchId ?? null,
        period.dateFrom,
        period.dateTo,
        period.toExclusiveDate,
      ],
    );

    const row = rows[0] ?? {};

    const markedAttendance = this.toNumber(row.marked_attendance);

    const attended = this.toNumber(row.attended);

    const attendanceRate =
      markedAttendance > 0
        ? Number(((attended / markedAttendance) * 100).toFixed(2))
        : 0;

    const alerts = await this.billingService.getAlerts({
      academyId: filters.academyId,
      branchId: filters.branchId,
      days: 7,
    });

    return {
      generatedAt: new Date().toISOString(),

      scope: {
        academyId: filters.academyId,
        branchId: filters.branchId ?? null,
      },

      period: {
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
      },

      metrics: {
        trainees: {
          total: this.toNumber(row.total_trainees),
          newInPeriod: this.toNumber(row.new_trainees),
        },

        training: {
          activeGroups: this.toNumber(row.active_groups),
          sessionsInPeriod: this.toNumber(row.sessions_count),
        },

        subscriptions: {
          active: this.toNumber(row.active_subscriptions),
          pending: this.toNumber(row.pending_subscriptions),
          expired: this.toNumber(row.expired_subscriptions),
          outstandingCount: this.toNumber(row.outstanding_count),
          outstandingBalance: this.roundMoney(
            this.toNumber(row.outstanding_balance),
          ),
        },

        revenue: {
          amount: this.roundMoney(this.toNumber(row.revenue_amount)),
          paymentsCount: this.toNumber(row.payments_count),
        },

        attendance: {
          marked: markedAttendance,
          attended,
          absentOrExcused: markedAttendance - attended,
          rate: attendanceRate,
        },
      },

      alerts: {
        expiringNext7Days: alerts.counts.expiring,
        expired: alerts.counts.expired,
        outstanding: alerts.counts.outstanding,
        overdueBalances: alerts.counts.overdueBalances,
      },
    };
  }

  private resolvePeriod(dateFrom?: string, dateTo?: string): DashboardPeriod {
    const now = new Date();

    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    )
      .toISOString()
      .slice(0, 10);

    const resolvedFrom = dateFrom ?? monthStart;

    const resolvedTo = dateTo ?? this.today();

    if (resolvedFrom > resolvedTo) {
      throw new BadRequestException('dateFrom cannot be after dateTo');
    }

    return {
      dateFrom: resolvedFrom,
      dateTo: resolvedTo,
      toExclusiveDate: this.addDays(resolvedTo, 1),
    };
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private addDays(date: string, days: number): string {
    const result = new Date(`${date}T00:00:00.000Z`);

    result.setUTCDate(result.getUTCDate() + days);

    return result.toISOString().slice(0, 10);
  }

  private toNumber(value: string | number | null | undefined): number {
    return Number(value ?? 0);
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
