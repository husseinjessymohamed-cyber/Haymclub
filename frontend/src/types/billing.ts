import type {
  BranchOption,
  SportOption,
  TrainingProgramOption,
} from './groups';

import type { Trainee } from './trainees';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'INSTAPAY'
  | 'VODAFONE_CASH'
  | 'OTHER';

export type TraineeSubscriptionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface SubscriptionPlan {
  id: string;
  academyId: string;
  sportId: string | null;
  programId: string | null;
  name: string;
  code: string;
  description: string | null;
  durationDays: number;
  price: number;
  registrationFee: number;
  sessionsLimit: number | null;
  freezeDaysAllowed: number;
  isActive: boolean;
  sport?: SportOption | null;
  program?: TrainingProgramOption | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentReceiver {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface SubscriptionPayment {
  id: string;
  academyId: string;
  branchId: string;
  subscriptionId: string;
  traineeId: string;
  receivedByUserId: string | null;
  paymentNumber: string;
  receiptNumber: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  referenceNumber: string | null;
  notes: string | null;
  receivedByUser?: PaymentReceiver | null;
  createdAt?: string;
}

export interface TraineeSubscription {
  id: string;
  academyId: string;
  branchId: string;
  traineeId: string;
  planId: string;
  subscriptionNumber: string;
  renewedFromSubscriptionId: string | null;
  startDate: string;
  endDate: string;
  status: TraineeSubscriptionStatus;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paidInFullAt: string | null;
  notes: string | null;
  trainee?: Trainee;
  branch?: BranchOption;
  plan?: SubscriptionPlan;
  payments?: SubscriptionPayment[];
  renewedFromSubscription?: TraineeSubscription | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSubscriptionPlanInput {
  academyId: string;
  sportId?: string;
  programId?: string;
  name: string;
  code: string;
  description?: string;
  durationDays: number;
  price: number;
  registrationFee?: number;
  sessionsLimit?: number;
  freezeDaysAllowed?: number;
  isActive?: boolean;
}

export type UpdateSubscriptionPlanInput = Partial<
  Omit<CreateSubscriptionPlanInput, 'academyId'>
>;

export interface CreateTraineeSubscriptionInput {
  academyId: string;
  branchId: string;
  traineeId: string;
  planId: string;
  startDate?: string;
  discountAmount?: number;
  notes?: string;
}

export interface RenewSubscriptionInput {
  planId?: string;
  startDate?: string;
  discountAmount?: number;
  notes?: string;
}

export interface CreatePaymentInput {
  amount: number;
  method: PaymentMethod;
  paidAt?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface BillingAlerts {
  generatedAt: string;

  window: {
    from: string;
    to: string;
    days: number;
  };

  counts: {
    expiring: number;
    expired: number;
    outstanding: number;
    overdueBalances: number;
  };

  expiring: TraineeSubscription[];
  expired: TraineeSubscription[];
  outstanding: TraineeSubscription[];
  overdueBalances: TraineeSubscription[];
}

export interface BillingReferenceData {
  academyId: string;
  academyName: string;
  branchId?: string;
  branchName: string;
  branches: BranchOption[];
  sports: SportOption[];
  programs: TrainingProgramOption[];
  trainees: Trainee[];
}

export interface SubscriptionFilters {
  academyId?: string;
  branchId?: string;
  traineeId?: string;
  planId?: string;
  status?: TraineeSubscriptionStatus;
}

export interface PlanFilters {
  academyId?: string;
  sportId?: string;
  programId?: string;
  isActive?: boolean;
}
