import axios from 'axios';

import { api } from './api';

import {
  getAcademyContext,
  getApiErrorMessage,
  getTrainees,
} from './trainees-api';

import type {
  BranchOption,
  SportOption,
  TrainingProgramOption,
} from '../types/groups';

import type {
  BillingAlerts,
  BillingReferenceData,
  CreatePaymentInput,
  CreateSubscriptionPlanInput,
  CreateTraineeSubscriptionInput,
  PlanFilters,
  RenewSubscriptionInput,
  SubscriptionFilters,
  SubscriptionPayment,
  SubscriptionPlan,
  TraineeSubscription,
  UpdateSubscriptionPlanInput,
} from '../types/billing';

function unwrapResponse<T>(data: unknown): T {
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data
  ) {
    return (data as { data: T }).data;
  }

  return data as T;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value)
    ? (value as T[])
    : [];
}

export async function getBillingReferenceData():
Promise<BillingReferenceData> {
  const context = await getAcademyContext();

  const [
    branchesResponse,
    sportsResponse,
    programsResponse,
    trainees,
  ] = await Promise.all([
    api.get('/branches'),

    api.get('/sports'),

    api.get('/training-programs', {
      params: {
        isActive: true,
      },
    }),

    getTrainees(),
  ]);

  const academyId = context.academyId ?? '';

  return {
    academyId,

    academyName:
      context.academyName ??
      'الأكاديمية الحالية',

    branchId: context.branchId,

    branchName:
      context.branchName ??
      'الفرع الرئيسي',

    branches: asArray<BranchOption>(
      unwrapResponse<unknown>(
        branchesResponse.data,
      ),
    ),

    sports: asArray<SportOption>(
      unwrapResponse<unknown>(
        sportsResponse.data,
      ),
    ),

    programs:
      asArray<TrainingProgramOption>(
        unwrapResponse<unknown>(
          programsResponse.data,
        ),
      ),

    trainees,
  };
}

export async function getSubscriptionPlans(
  filters: PlanFilters = {},
): Promise<SubscriptionPlan[]> {
  const response = await api.get(
    '/billing/plans',
    {
      params: filters,
    },
  );

  return asArray<SubscriptionPlan>(
    unwrapResponse<unknown>(response.data),
  );
}

export async function createSubscriptionPlan(
  input: CreateSubscriptionPlanInput,
): Promise<SubscriptionPlan> {
  const response = await api.post(
    '/billing/plans',
    input,
  );

  return unwrapResponse<SubscriptionPlan>(
    response.data,
  );
}

export async function updateSubscriptionPlan(
  id: string,
  input: UpdateSubscriptionPlanInput,
): Promise<SubscriptionPlan> {
  const response = await api.patch(
    `/billing/plans/${id}`,
    input,
  );

  return unwrapResponse<SubscriptionPlan>(
    response.data,
  );
}

export async function getSubscriptions(
  filters: SubscriptionFilters = {},
): Promise<TraineeSubscription[]> {
  const response = await api.get(
    '/billing/subscriptions',
    {
      params: filters,
    },
  );

  return asArray<TraineeSubscription>(
    unwrapResponse<unknown>(response.data),
  );
}

export async function getSubscription(
  id: string,
): Promise<TraineeSubscription> {
  const response = await api.get(
    `/billing/subscriptions/${id}`,
  );

  return unwrapResponse<TraineeSubscription>(
    response.data,
  );
}

export async function createSubscription(
  input: CreateTraineeSubscriptionInput,
): Promise<TraineeSubscription> {
  const response = await api.post(
    '/billing/subscriptions',
    input,
  );

  return unwrapResponse<TraineeSubscription>(
    response.data,
  );
}

export async function renewSubscription(
  id: string,
  input: RenewSubscriptionInput,
): Promise<TraineeSubscription> {
  const response = await api.post(
    `/billing/subscriptions/${id}/renew`,
    input,
  );

  return unwrapResponse<TraineeSubscription>(
    response.data,
  );
}

export async function addSubscriptionPayment(
  id: string,
  input: CreatePaymentInput,
): Promise<TraineeSubscription> {
  const response = await api.post(
    `/billing/subscriptions/${id}/payments`,
    input,
  );

  return unwrapResponse<TraineeSubscription>(
    response.data,
  );
}

export async function getSubscriptionPayments(
  id: string,
): Promise<SubscriptionPayment[]> {
  const response = await api.get(
    `/billing/subscriptions/${id}/payments`,
  );

  return asArray<SubscriptionPayment>(
    unwrapResponse<unknown>(response.data),
  );
}

export async function getBillingAlerts(
  academyId: string,
  branchId?: string,
  days = 7,
): Promise<BillingAlerts> {
  const response = await api.get(
    '/billing/alerts',
    {
      params: {
        academyId,
        branchId,
        days,
      },
    },
  );

  return unwrapResponse<BillingAlerts>(
    response.data,
  );
}

export async function syncSubscriptionStatuses(
  academyId: string,
  branchId?: string,
): Promise<{
  date: string;
  expired: number;
  activated: number;
}> {
  const response = await api.post(
    '/billing/maintenance/sync-subscriptions',
    undefined,
    {
      params: {
        academyId,
        branchId,
      },
    },
  );

  return unwrapResponse<{
    date: string;
    expired: number;
    activated: number;
  }>(response.data);
}

export function getBillingApiError(
  error: unknown,
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string | string[];
          error?: string;
        }
      | undefined;

    if (Array.isArray(data?.message)) {
      return data.message.join('، ');
    }

    if (typeof data?.message === 'string') {
      return data.message;
    }

    if (typeof data?.error === 'string') {
      return data.error;
    }

    if (!error.response) {
      return 'تعذر الاتصال بالخادم';
    }
  }

  return getApiErrorMessage(error);
}
