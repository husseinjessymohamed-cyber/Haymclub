import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { FormEvent } from 'react';

import {
  addSubscriptionPayment,
  createSubscription,
  createSubscriptionPlan,
  getBillingAlerts,
  getBillingApiError,
  getBillingReferenceData,
  getSubscription,
  getSubscriptionPlans,
  getSubscriptions,
  renewSubscription,
  syncSubscriptionStatuses,
  updateSubscriptionPlan,
} from '../../lib/billing-api';

import type {
  BillingAlerts,
  BillingReferenceData,
  PaymentMethod,
  SubscriptionPlan,
  TraineeSubscription,
  TraineeSubscriptionStatus,
} from '../../types/billing';

import type { Trainee } from '../../types/trainees';

import './BillingPage.css';

interface BillingPageProps {
  onBack: () => void;
}

type BillingTab =
  | 'subscriptions'
  | 'plans'
  | 'alerts';

interface PlanFormState {
  sportId: string;
  programId: string;
  name: string;
  code: string;
  description: string;
  durationDays: string;
  price: string;
  registrationFee: string;
  sessionsLimit: string;
  freezeDaysAllowed: string;
  isActive: boolean;
}

interface SubscriptionFormState {
  traineeId: string;
  planId: string;
  startDate: string;
  discountAmount: string;
  notes: string;
}

interface PaymentFormState {
  amount: string;
  method: PaymentMethod;
  paidAt: string;
  referenceNumber: string;
  notes: string;
}

interface RenewalFormState {
  planId: string;
  startDate: string;
  discountAmount: string;
  notes: string;
}

const EMPTY_REFERENCE_DATA: BillingReferenceData = {
  academyId: '',
  academyName: 'الأكاديمية الحالية',
  branchName: 'الفرع الرئيسي',
  branches: [],
  sports: [],
  programs: [],
  trainees: [],
};

const EMPTY_PLAN_FORM: PlanFormState = {
  sportId: '',
  programId: '',
  name: '',
  code: '',
  description: '',
  durationDays: '30',
  price: '0',
  registrationFee: '0',
  sessionsLimit: '',
  freezeDaysAllowed: '0',
  isActive: true,
};

const EMPTY_SUBSCRIPTION_FORM:
SubscriptionFormState = {
  traineeId: '',
  planId: '',
  startDate: new Date()
    .toISOString()
    .slice(0, 10),
  discountAmount: '0',
  notes: '',
};

const EMPTY_PAYMENT_FORM: PaymentFormState = {
  amount: '',
  method: 'CASH',
  paidAt: new Date()
    .toISOString()
    .slice(0, 10),
  referenceNumber: '',
  notes: '',
};

const EMPTY_RENEWAL_FORM: RenewalFormState = {
  planId: '',
  startDate: '',
  discountAmount: '0',
  notes: '',
};

const STATUS_LABELS: Record<
  TraineeSubscriptionStatus,
  string
> = {
  PENDING: 'قيد الانتظار',
  ACTIVE: 'نشط',
  PAUSED: 'متوقف',
  EXPIRED: 'منتهي',
  CANCELLED: 'ملغي',
};

const PAYMENT_METHOD_LABELS: Record<
  PaymentMethod,
  string
> = {
  CASH: 'نقدي',
  CARD: 'بطاقة',
  BANK_TRANSFER: 'تحويل بنكي',
  INSTAPAY: 'إنستاباي',
  VODAFONE_CASH: 'فودافون كاش',
  OTHER: 'أخرى',
};

function money(value: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function dateLabel(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
  }).format(parsed);
}

function dateTimeLabel(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function traineeName(
  trainee?: Trainee,
): string {
  if (!trainee) {
    return 'متدرب غير محدد';
  }

  return `${trainee.firstName} ${trainee.lastName}`;
}

function positiveNumber(
  value: string,
  fieldName: string,
  allowZero = true,
): number {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < (allowZero ? 0 : 0.01)
  ) {
    throw new Error(
      `${fieldName} يحتوي على قيمة غير صحيحة`,
    );
  }

  return parsed;
}

function positiveInteger(
  value: string,
  fieldName: string,
  minimum: number,
): number {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < minimum
  ) {
    throw new Error(
      `${fieldName} يجب أن يكون رقمًا صحيحًا`,
    );
  }

  return parsed;
}

export function BillingPage({
  onBack,
}: BillingPageProps) {
  const [tab, setTab] =
    useState<BillingTab>('subscriptions');

  const [referenceData, setReferenceData] =
    useState<BillingReferenceData>(
      EMPTY_REFERENCE_DATA,
    );

  const [plans, setPlans] = useState<
    SubscriptionPlan[]
  >([]);

  const [subscriptions, setSubscriptions] =
    useState<TraineeSubscription[]>([]);

  const [alerts, setAlerts] =
    useState<BillingAlerts | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] =
    useState('');

  const [planFilter, setPlanFilter] =
    useState('');

  const [branchFilter, setBranchFilter] =
    useState('');

  const [alertDays, setAlertDays] =
    useState('7');

  const [planModalOpen, setPlanModalOpen] =
    useState(false);

  const [editingPlan, setEditingPlan] =
    useState<SubscriptionPlan | null>(null);

  const [planForm, setPlanForm] =
    useState<PlanFormState>(
      EMPTY_PLAN_FORM,
    );

  const [
    subscriptionModalOpen,
    setSubscriptionModalOpen,
  ] = useState(false);

  const [
    subscriptionForm,
    setSubscriptionForm,
  ] = useState<SubscriptionFormState>(
    EMPTY_SUBSCRIPTION_FORM,
  );

  const [
    paymentSubscription,
    setPaymentSubscription,
  ] = useState<TraineeSubscription | null>(
    null,
  );

  const [paymentForm, setPaymentForm] =
    useState<PaymentFormState>(
      EMPTY_PAYMENT_FORM,
    );

  const [
    renewalSubscription,
    setRenewalSubscription,
  ] = useState<TraineeSubscription | null>(
    null,
  );

  const [renewalForm, setRenewalForm] =
    useState<RenewalFormState>(
      EMPTY_RENEWAL_FORM,
    );

  const [
    detailSubscription,
    setDetailSubscription,
  ] = useState<TraineeSubscription | null>(
    null,
  );

  async function loadBillingData(
    academyId: string,
    days = Number(alertDays) || 7,
  ): Promise<void> {
    const [
      loadedPlans,
      loadedSubscriptions,
      loadedAlerts,
    ] = await Promise.all([
      getSubscriptionPlans({
        academyId,
      }),

      getSubscriptions({
        academyId,
      }),

      getBillingAlerts(
        academyId,
        referenceData.branchId,
        days,
      ),
    ]);

    setPlans(loadedPlans);
    setSubscriptions(loadedSubscriptions);
    setAlerts(loadedAlerts);
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize(): Promise<void> {
      setLoading(true);
      setError('');

      try {
        const references =
          await getBillingReferenceData();

        if (!references.academyId) {
          throw new Error(
            'تعذر تحديد الأكاديمية الحالية',
          );
        }

        const [
          loadedPlans,
          loadedSubscriptions,
          loadedAlerts,
        ] = await Promise.all([
          getSubscriptionPlans({
            academyId:
              references.academyId,
          }),

          getSubscriptions({
            academyId:
              references.academyId,
          }),

          getBillingAlerts(
            references.academyId,
            references.branchId,
            7,
          ),
        ]);

        if (cancelled) {
          return;
        }

        setReferenceData(references);
        setPlans(loadedPlans);
        setSubscriptions(
          loadedSubscriptions,
        );
        setAlerts(loadedAlerts);
      } catch (initializationError: unknown) {
        if (!cancelled) {
          setError(
            getBillingApiError(
              initializationError,
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const activePlans = useMemo(
    () =>
      plans.filter(
        (plan) => plan.isActive,
      ),
    [plans],
  );

  const filteredPrograms = useMemo(() => {
    if (!planForm.sportId) {
      return referenceData.programs;
    }

    return referenceData.programs.filter(
      (program) =>
        program.sportId ===
        planForm.sportId,
    );
  }, [
    planForm.sportId,
    referenceData.programs,
  ]);

  const visibleSubscriptions = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return subscriptions.filter(
      (subscription) => {
        if (
          statusFilter &&
          subscription.status !==
            statusFilter
        ) {
          return false;
        }

        if (
          planFilter &&
          subscription.planId !== planFilter
        ) {
          return false;
        }

        if (
          branchFilter &&
          subscription.branchId !==
            branchFilter
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        const values = [
          subscription.subscriptionNumber,
          subscription.trainee
            ?.registrationCode,
          subscription.trainee?.firstName,
          subscription.trainee?.lastName,
          subscription.trainee?.phone,
          subscription.plan?.name,
          subscription.plan?.code,
          subscription.branch?.name,
        ];

        return values.some((value) =>
          value
            ?.toLowerCase()
            .includes(query),
        );
      },
    );
  }, [
    branchFilter,
    planFilter,
    search,
    statusFilter,
    subscriptions,
  ]);

  const totals = useMemo(() => {
    return subscriptions.reduce(
      (result, subscription) => {
        result.total +=
          Number(
            subscription.totalAmount,
          ) || 0;

        result.paid +=
          Number(
            subscription.paidAmount,
          ) || 0;

        result.balance +=
          Number(
            subscription.balanceAmount,
          ) || 0;

        if (
          subscription.status === 'ACTIVE'
        ) {
          result.active += 1;
        }

        return result;
      },
      {
        total: 0,
        paid: 0,
        balance: 0,
        active: 0,
      },
    );
  }, [subscriptions]);

  const selectedSubscriptionPlan =
    useMemo(
      () =>
        plans.find(
          (plan) =>
            plan.id ===
            subscriptionForm.planId,
        ),
      [plans, subscriptionForm.planId],
    );

  const selectedSubscriptionTrainee =
    useMemo(
      () =>
        referenceData.trainees.find(
          (trainee) =>
            trainee.id ===
            subscriptionForm.traineeId,
        ),
      [
        referenceData.trainees,
        subscriptionForm.traineeId,
      ],
    );

  function showMessage(
    type: 'success' | 'error',
    message: string,
  ): void {
    if (type === 'success') {
      setNotice(message);
      setError('');
    } else {
      setError(message);
      setNotice('');
    }
  }

  async function refresh(): Promise<void> {
    if (!referenceData.academyId) {
      return;
    }

    setLoading(true);

    try {
      await loadBillingData(
        referenceData.academyId,
      );

      showMessage(
        'success',
        'تم تحديث بيانات الاشتراكات',
      );
    } catch (refreshError: unknown) {
      showMessage(
        'error',
        getBillingApiError(refreshError),
      );
    } finally {
      setLoading(false);
    }
  }

  function openCreatePlan(): void {
    setEditingPlan(null);
    setPlanForm(EMPTY_PLAN_FORM);
    setPlanModalOpen(true);
    setError('');
    setNotice('');
  }

  function openEditPlan(
    plan: SubscriptionPlan,
  ): void {
    setEditingPlan(plan);

    setPlanForm({
      sportId: plan.sportId ?? '',
      programId: plan.programId ?? '',
      name: plan.name,
      code: plan.code,
      description:
        plan.description ?? '',
      durationDays: String(
        plan.durationDays,
      ),
      price: String(plan.price),
      registrationFee: String(
        plan.registrationFee,
      ),
      sessionsLimit:
        plan.sessionsLimit !== null
          ? String(plan.sessionsLimit)
          : '',
      freezeDaysAllowed: String(
        plan.freezeDaysAllowed,
      ),
      isActive: plan.isActive,
    });

    setPlanModalOpen(true);
    setError('');
    setNotice('');
  }

  async function submitPlan(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const durationDays =
        positiveInteger(
          planForm.durationDays,
          'مدة الاشتراك',
          1,
        );

      const price = positiveNumber(
        planForm.price,
        'السعر',
      );

      const registrationFee =
        positiveNumber(
          planForm.registrationFee || '0',
          'رسوم التسجيل',
        );

      const freezeDaysAllowed =
        positiveInteger(
          planForm.freezeDaysAllowed ||
            '0',
          'أيام التجميد',
          0,
        );

      const sessionsLimit =
        planForm.sessionsLimit
          ? positiveInteger(
              planForm.sessionsLimit,
              'عدد الحصص',
              1,
            )
          : undefined;

      const commonInput = {
        sportId:
          planForm.sportId || undefined,

        programId:
          planForm.programId || undefined,

        name: planForm.name.trim(),

        code: planForm.code
          .trim()
          .toUpperCase(),

        description:
          planForm.description.trim() ||
          undefined,

        durationDays,
        price,
        registrationFee,
        sessionsLimit,
        freezeDaysAllowed,
        isActive: planForm.isActive,
      };

      if (editingPlan) {
        await updateSubscriptionPlan(
          editingPlan.id,
          commonInput,
        );

        showMessage(
          'success',
          'تم تحديث خطة الاشتراك',
        );
      } else {
        if (!referenceData.academyId) {
          throw new Error(
            'تعذر تحديد الأكاديمية',
          );
        }

        await createSubscriptionPlan({
          academyId:
            referenceData.academyId,

          ...commonInput,
        });

        showMessage(
          'success',
          'تم إنشاء خطة الاشتراك',
        );
      }

      setPlanModalOpen(false);
      setEditingPlan(null);

      await loadBillingData(
        referenceData.academyId,
      );
    } catch (planError: unknown) {
      showMessage(
        'error',
        getBillingApiError(planError),
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePlan(
    plan: SubscriptionPlan,
  ): Promise<void> {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      await updateSubscriptionPlan(
        plan.id,
        {
          isActive: !plan.isActive,
        },
      );

      await loadBillingData(
        referenceData.academyId,
      );

      showMessage(
        'success',
        plan.isActive
          ? 'تم إيقاف الخطة'
          : 'تم تفعيل الخطة',
      );
    } catch (toggleError: unknown) {
      showMessage(
        'error',
        getBillingApiError(toggleError),
      );
    } finally {
      setSaving(false);
    }
  }

  function openCreateSubscription(): void {
    const firstTrainee =
      referenceData.trainees.find(
        (trainee) =>
          trainee.isActive !== false,
      );

    const firstPlan =
      activePlans[0];

    setSubscriptionForm({
      ...EMPTY_SUBSCRIPTION_FORM,

      traineeId:
        firstTrainee?.id ?? '',

      planId: firstPlan?.id ?? '',
    });

    setSubscriptionModalOpen(true);
    setError('');
    setNotice('');
  }

  async function submitSubscription(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const trainee =
        referenceData.trainees.find(
          (item) =>
            item.id ===
            subscriptionForm.traineeId,
        );

      if (!trainee) {
        throw new Error(
          'يجب اختيار المتدرب',
        );
      }

      if (!subscriptionForm.planId) {
        throw new Error(
          'يجب اختيار خطة الاشتراك',
        );
      }

      const discountAmount =
        positiveNumber(
          subscriptionForm
            .discountAmount || '0',
          'الخصم',
        );

      const created =
        await createSubscription({
          academyId:
            referenceData.academyId,

          branchId: trainee.branchId,

          traineeId: trainee.id,

          planId:
            subscriptionForm.planId,

          startDate:
            subscriptionForm.startDate ||
            undefined,

          discountAmount,

          notes:
            subscriptionForm.notes
              .trim() || undefined,
        });

      setSubscriptionModalOpen(false);

      await loadBillingData(
        referenceData.academyId,
      );

      showMessage(
        'success',
        'تم إنشاء اشتراك المتدرب',
      );

      if (
        Number(created.balanceAmount) > 0
      ) {
        setPaymentSubscription(created);

        setPaymentForm({
          ...EMPTY_PAYMENT_FORM,

          amount: String(
            created.balanceAmount,
          ),
        });
      }
    } catch (subscriptionError: unknown) {
      showMessage(
        'error',
        getBillingApiError(
          subscriptionError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  function openPayment(
    subscription: TraineeSubscription,
  ): void {
    setPaymentSubscription(subscription);

    setPaymentForm({
      ...EMPTY_PAYMENT_FORM,

      amount: String(
        subscription.balanceAmount,
      ),
    });

    setError('');
    setNotice('');
  }

  async function submitPayment(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!paymentSubscription) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const amount = positiveNumber(
        paymentForm.amount,
        'قيمة الدفعة',
        false,
      );

      if (
        amount >
        Number(
          paymentSubscription.balanceAmount,
        )
      ) {
        throw new Error(
          'قيمة الدفعة أكبر من الرصيد المتبقي',
        );
      }

      const updated =
        await addSubscriptionPayment(
          paymentSubscription.id,
          {
            amount,

            method: paymentForm.method,

            paidAt:
              paymentForm.paidAt ||
              undefined,

            referenceNumber:
              paymentForm.referenceNumber
                .trim() || undefined,

            notes:
              paymentForm.notes.trim() ||
              undefined,
          },
        );

      setPaymentSubscription(null);

      await loadBillingData(
        referenceData.academyId,
      );

      if (
        detailSubscription?.id ===
        updated.id
      ) {
        setDetailSubscription(updated);
      }

      showMessage(
        'success',
        'تم تسجيل الدفعة وإصدار الإيصال',
      );
    } catch (paymentError: unknown) {
      showMessage(
        'error',
        getBillingApiError(paymentError),
      );
    } finally {
      setSaving(false);
    }
  }

  function openRenewal(
    subscription: TraineeSubscription,
  ): void {
    setRenewalSubscription(subscription);

    setRenewalForm({
      ...EMPTY_RENEWAL_FORM,

      planId: subscription.planId,
    });

    setError('');
    setNotice('');
  }

  async function submitRenewal(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!renewalSubscription) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await renewSubscription(
        renewalSubscription.id,
        {
          planId:
            renewalForm.planId ||
            undefined,

          startDate:
            renewalForm.startDate ||
            undefined,

          discountAmount:
            positiveNumber(
              renewalForm
                .discountAmount || '0',
              'الخصم',
            ),

          notes:
            renewalForm.notes.trim() ||
            undefined,
        },
      );

      setRenewalSubscription(null);

      await loadBillingData(
        referenceData.academyId,
      );

      showMessage(
        'success',
        'تم تجديد الاشتراك بنجاح',
      );
    } catch (renewalError: unknown) {
      showMessage(
        'error',
        getBillingApiError(renewalError),
      );
    } finally {
      setSaving(false);
    }
  }

  async function openDetails(
    subscription: TraineeSubscription,
  ): Promise<void> {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const details =
        await getSubscription(
          subscription.id,
        );

      setDetailSubscription(details);
    } catch (detailError: unknown) {
      showMessage(
        'error',
        getBillingApiError(detailError),
      );
    } finally {
      setSaving(false);
    }
  }

  async function refreshAlerts(): Promise<void> {
    if (!referenceData.academyId) {
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const days = positiveInteger(
        alertDays,
        'مدة التنبيه',
        1,
      );

      const result =
        await getBillingAlerts(
          referenceData.academyId,
          branchFilter || undefined,
          days,
        );

      setAlerts(result);

      showMessage(
        'success',
        'تم تحديث التنبيهات',
      );
    } catch (alertError: unknown) {
      showMessage(
        'error',
        getBillingApiError(alertError),
      );
    } finally {
      setLoading(false);
    }
  }

  async function synchronizeStatuses():
  Promise<void> {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const result =
        await syncSubscriptionStatuses(
          referenceData.academyId,
          branchFilter || undefined,
        );

      await loadBillingData(
        referenceData.academyId,
      );

      showMessage(
        'success',
        `تم التحديث: تفعيل ${result.activated} وانتهاء ${result.expired}`,
      );
    } catch (syncError: unknown) {
      showMessage(
        'error',
        getBillingApiError(syncError),
      );
    } finally {
      setSaving(false);
    }
  }

  function renderAlertList(
    title: string,
    list: TraineeSubscription[],
    emptyMessage: string,
  ) {
    return (
      <section className="billing-alert-section">
        <header>
          <h2>{title}</h2>
          <span>{list.length}</span>
        </header>

        {list.length === 0 ? (
          <p className="billing-alert-empty">
            {emptyMessage}
          </p>
        ) : (
          <div className="billing-alert-list">
            {list.map((subscription) => (
              <article
                key={subscription.id}
              >
                <div>
                  <strong>
                    {traineeName(
                      subscription.trainee,
                    )}
                  </strong>

                  <span>
                    {subscription.plan?.name ??
                      'خطة اشتراك'}
                  </span>
                </div>

                <div>
                  <strong>
                    {money(
                      subscription
                        .balanceAmount,
                    )}
                  </strong>

                  <span>
                    ينتهي{' '}
                    {dateLabel(
                      subscription.endDate,
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void openDetails(
                      subscription,
                    )
                  }
                >
                  التفاصيل
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <main
      className="billing-page"
      dir="rtl"
    >
      <header className="billing-header">
        <div>
          <button
            type="button"
            className="billing-back-button"
            onClick={onBack}
          >
            ← الرجوع إلى لوحة التحكم
          </button>

          <p className="billing-eyebrow">
            الإدارة المالية
          </p>

          <h1>
            الاشتراكات والمدفوعات
          </h1>

          <p className="billing-description">
            إدارة الخطط واشتراكات
            المتدربين والمدفوعات
            والأرصدة والتنبيهات.
          </p>
        </div>

        <div className="billing-header-actions">
          <button
            type="button"
            onClick={() =>
              void synchronizeStatuses()
            }
            disabled={saving}
          >
            مزامنة الحالات
          </button>

          <button
            type="button"
            className="billing-primary-button"
            onClick={
              tab === 'plans'
                ? openCreatePlan
                : openCreateSubscription
            }
          >
            {tab === 'plans'
              ? '＋ خطة جديدة'
              : '＋ اشتراك جديد'}
          </button>
        </div>
      </header>

      <section className="billing-context">
        <div>
          <span>الأكاديمية</span>
          <strong>
            {referenceData.academyName}
          </strong>
        </div>

        <div>
          <span>الفرع</span>
          <strong>
            {referenceData.branchName}
          </strong>
        </div>
      </section>

      <section className="billing-statistics">
        <article>
          <span>الاشتراكات النشطة</span>
          <strong>{totals.active}</strong>
        </article>

        <article>
          <span>إجمالي المستحقات</span>
          <strong>
            {money(totals.total)}
          </strong>
        </article>

        <article>
          <span>المبالغ المحصلة</span>
          <strong>
            {money(totals.paid)}
          </strong>
        </article>

        <article>
          <span>الرصيد المتبقي</span>
          <strong>
            {money(totals.balance)}
          </strong>
        </article>
      </section>

      {(error || notice) && (
        <div
          className={
            error
              ? 'billing-message billing-error'
              : 'billing-message billing-success'
          }
        >
          {error || notice}
        </div>
      )}

      <nav className="billing-tabs">
        <button
          type="button"
          className={
            tab === 'subscriptions'
              ? 'active'
              : ''
          }
          onClick={() =>
            setTab('subscriptions')
          }
        >
          الاشتراكات
        </button>

        <button
          type="button"
          className={
            tab === 'plans'
              ? 'active'
              : ''
          }
          onClick={() => setTab('plans')}
        >
          خطط الاشتراك
        </button>

        <button
          type="button"
          className={
            tab === 'alerts'
              ? 'active'
              : ''
          }
          onClick={() => setTab('alerts')}
        >
          التنبيهات
          {(alerts?.counts.outstanding ??
            0) > 0 && (
            <span>
              {alerts?.counts.outstanding}
            </span>
          )}
        </button>
      </nav>

      {tab === 'subscriptions' && (
        <>
          <section className="billing-toolbar">
            <input
              type="search"
              value={search}
              placeholder="ابحث باسم المتدرب أو الكود أو رقم الاشتراك"
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
            >
              <option value="">
                كل الحالات
              </option>

              {Object.entries(
                STATUS_LABELS,
              ).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ))}
            </select>

            <select
              value={planFilter}
              onChange={(event) =>
                setPlanFilter(
                  event.target.value,
                )
              }
            >
              <option value="">
                كل الخطط
              </option>

              {plans.map((plan) => (
                <option
                  key={plan.id}
                  value={plan.id}
                >
                  {plan.name}
                </option>
              ))}
            </select>

            <select
              value={branchFilter}
              onChange={(event) =>
                setBranchFilter(
                  event.target.value,
                )
              }
            >
              <option value="">
                كل الفروع
              </option>

              {referenceData.branches.map(
                (branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              onClick={() =>
                void refresh()
              }
            >
              تحديث
            </button>
          </section>

          <section className="billing-content">
            {loading ? (
              <div className="billing-empty-state">
                جارٍ تحميل الاشتراكات...
              </div>
            ) : visibleSubscriptions
                .length === 0 ? (
              <div className="billing-empty-state">
                <div>💳</div>
                <h2>
                  لا توجد اشتراكات
                </h2>
                <p>
                  أنشئ أول اشتراك لأحد
                  المتدربين.
                </p>

                <button
                  type="button"
                  className="billing-primary-button"
                  onClick={
                    openCreateSubscription
                  }
                >
                  إنشاء اشتراك
                </button>
              </div>
            ) : (
              <div className="billing-table-wrapper">
                <table className="billing-table">
                  <thead>
                    <tr>
                      <th>المتدرب</th>
                      <th>رقم الاشتراك</th>
                      <th>الخطة</th>
                      <th>المدة</th>
                      <th>الإجمالي</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                      <th>الحالة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleSubscriptions.map(
                      (subscription) => (
                        <tr
                          key={subscription.id}
                        >
                          <td>
                            <div className="billing-trainee">
                              <span>
                                {subscription
                                  .trainee
                                  ?.firstName
                                  ?.charAt(0) ??
                                  'م'}
                              </span>

                              <div>
                                <strong>
                                  {traineeName(
                                    subscription
                                      .trainee,
                                  )}
                                </strong>

                                <small>
                                  {subscription
                                    .trainee
                                    ?.registrationCode ??
                                    '—'}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <code>
                              {
                                subscription.subscriptionNumber
                              }
                            </code>
                          </td>

                          <td>
                            {subscription
                              .plan?.name ??
                              '—'}
                          </td>

                          <td>
                            <small>
                              {dateLabel(
                                subscription.startDate,
                              )}
                              <br />
                              إلى{' '}
                              {dateLabel(
                                subscription.endDate,
                              )}
                            </small>
                          </td>

                          <td>
                            {money(
                              subscription.totalAmount,
                            )}
                          </td>

                          <td className="billing-paid">
                            {money(
                              subscription.paidAmount,
                            )}
                          </td>

                          <td
                            className={
                              Number(
                                subscription.balanceAmount,
                              ) > 0
                                ? 'billing-balance'
                                : 'billing-paid'
                            }
                          >
                            {money(
                              subscription.balanceAmount,
                            )}
                          </td>

                          <td>
                            <span
                              className={`billing-status billing-status-${subscription.status.toLowerCase()}`}
                            >
                              {
                                STATUS_LABELS[
                                  subscription.status
                                ]
                              }
                            </span>
                          </td>

                          <td>
                            <div className="billing-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  void openDetails(
                                    subscription,
                                  )
                                }
                              >
                                التفاصيل
                              </button>

                              {Number(
                                subscription.balanceAmount,
                              ) > 0 &&
                                subscription.status !==
                                  'CANCELLED' && (
                                  <button
                                    type="button"
                                    className="payment"
                                    onClick={() =>
                                      openPayment(
                                        subscription,
                                      )
                                    }
                                  >
                                    دفعة
                                  </button>
                                )}

                              {subscription.status !==
                                'CANCELLED' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openRenewal(
                                      subscription,
                                    )
                                  }
                                >
                                  تجديد
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'plans' && (
        <section className="billing-content">
          {plans.length === 0 ? (
            <div className="billing-empty-state">
              <div>📦</div>
              <h2>
                لا توجد خطط اشتراك
              </h2>

              <button
                type="button"
                className="billing-primary-button"
                onClick={openCreatePlan}
              >
                إنشاء خطة
              </button>
            </div>
          ) : (
            <div className="billing-plans-grid">
              {plans.map((plan) => (
                <article
                  className="billing-plan-card"
                  key={plan.id}
                >
                  <header>
                    <div>
                      <span>
                        {plan.code}
                      </span>
                      <h2>{plan.name}</h2>
                      <p>
                        {plan.sport?.name ??
                          'كل الرياضات'}
                      </p>
                    </div>

                    <span
                      className={
                        plan.isActive
                          ? 'billing-plan-active'
                          : 'billing-plan-inactive'
                      }
                    >
                      {plan.isActive
                        ? 'مفعلة'
                        : 'متوقفة'}
                    </span>
                  </header>

                  <div className="billing-plan-price">
                    <strong>
                      {money(plan.price)}
                    </strong>

                    <span>
                      كل {plan.durationDays}{' '}
                      يوم
                    </span>
                  </div>

                  <div className="billing-plan-details">
                    <div>
                      <span>
                        رسوم التسجيل
                      </span>
                      <strong>
                        {money(
                          plan.registrationFee,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>عدد الحصص</span>
                      <strong>
                        {plan.sessionsLimit ??
                          'غير محدود'}
                      </strong>
                    </div>

                    <div>
                      <span>
                        أيام التجميد
                      </span>
                      <strong>
                        {
                          plan.freezeDaysAllowed
                        }
                      </strong>
                    </div>

                    <div>
                      <span>البرنامج</span>
                      <strong>
                        {plan.program?.name ??
                          'عام'}
                      </strong>
                    </div>
                  </div>

                  {plan.description && (
                    <p className="billing-plan-description">
                      {plan.description}
                    </p>
                  )}

                  <footer>
                    <button
                      type="button"
                      onClick={() =>
                        openEditPlan(plan)
                      }
                    >
                      تعديل
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      className={
                        plan.isActive
                          ? 'danger'
                          : ''
                      }
                      onClick={() =>
                        void togglePlan(plan)
                      }
                    >
                      {plan.isActive
                        ? 'إيقاف'
                        : 'تفعيل'}
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'alerts' && (
        <section className="billing-alerts-page">
          <div className="billing-alert-controls">
            <label>
              مدة التنبيه بالأيام
              <input
                type="number"
                min={1}
                max={365}
                value={alertDays}
                onChange={(event) =>
                  setAlertDays(
                    event.target.value,
                  )
                }
              />
            </label>

            <button
              type="button"
              onClick={() =>
                void refreshAlerts()
              }
            >
              تحديث التنبيهات
            </button>
          </div>

          <div className="billing-alert-counts">
            <article>
              <span>تنتهي قريبًا</span>
              <strong>
                {alerts?.counts.expiring ??
                  0}
              </strong>
            </article>

            <article>
              <span>منتهية</span>
              <strong>
                {alerts?.counts.expired ??
                  0}
              </strong>
            </article>

            <article>
              <span>
                عليها مبالغ مستحقة
              </span>
              <strong>
                {alerts?.counts
                  .outstanding ?? 0}
              </strong>
            </article>

            <article>
              <span>
                أرصدة متأخرة
              </span>
              <strong>
                {alerts?.counts
                  .overdueBalances ?? 0}
              </strong>
            </article>
          </div>

          {alerts && (
            <div className="billing-alert-sections">
              {renderAlertList(
                'اشتراكات تنتهي قريبًا',
                alerts.expiring,
                'لا توجد اشتراكات تنتهي خلال المدة المحددة.',
              )}

              {renderAlertList(
                'أرصدة متأخرة',
                alerts.overdueBalances,
                'لا توجد أرصدة متأخرة.',
              )}

              {renderAlertList(
                'جميع المبالغ المستحقة',
                alerts.outstanding,
                'لا توجد مبالغ مستحقة.',
              )}

              {renderAlertList(
                'الاشتراكات المنتهية',
                alerts.expired,
                'لا توجد اشتراكات منتهية.',
              )}
            </div>
          )}
        </section>
      )}

      {planModalOpen && (
        <div className="billing-overlay">
          <section className="billing-modal">
            <header>
              <div>
                <p>خطة الاشتراك</p>
                <h2>
                  {editingPlan
                    ? 'تعديل الخطة'
                    : 'إنشاء خطة جديدة'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPlanModalOpen(false)
                }
              >
                ×
              </button>
            </header>

            <form onSubmit={submitPlan}>
              <div className="billing-form-grid">
                <label>
                  اسم الخطة
                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    value={planForm.name}
                    onChange={(event) =>
                      setPlanForm(
                        (current) => ({
                          ...current,
                          name:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  كود الخطة
                  <input
                    required
                    minLength={2}
                    maxLength={60}
                    pattern="[A-Za-z0-9_-]+"
                    value={planForm.code}
                    onChange={(event) =>
                      setPlanForm(
                        (current) => ({
                          ...current,
                          code:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  الرياضة
                  <select
                    value={
                      planForm.sportId
                    }
                    onChange={(event) => {
                      const sportId =
                        event.target.value;

                      const currentProgram =
                        referenceData.programs.find(
                          (program) =>
                            program.id ===
                            planForm.programId,
                        );

                      setPlanForm(
                        (current) => ({
                          ...current,
                          sportId,

                          programId:
                            !sportId ||
                            currentProgram
                              ?.sportId ===
                              sportId
                              ? current.programId
                              : '',
                        }),
                      );
                    }}
                  >
                    <option value="">
                      كل الرياضات
                    </option>

                    {referenceData.sports.map(
                      (sport) => (
                        <option
                          key={sport.id}
                          value={sport.id}
                        >
                          {sport.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  البرنامج التدريبي
                  <select
                    value={
                      planForm.programId
                    }
                    onChange={(event) =>
                      setPlanForm(
                        (current) => ({
                          ...current,
                          programId:
                            event.target
                              .value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      خطة عامة
                    </option>

                    {filteredPrograms.map(
                      (program) => (
                        <option
                          key={program.id}
                          value={program.id}
                        >
                          {program.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  مدة الخطة بالأيام
                  <input
                    required
                    type="number"
                    min={1}
                    max={3650}
                    value={
                      planForm.durationDays
                    }
                    onChange={(event) =>
                      setPlanForm(
                        (current) => ({
                          ...current,
                          durationDays:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  السعر
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    value={planForm.price}
                    onChange={(event) =>
                      setPlanForm(
                        (current) => ({
                          ...current,
                          price:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  رسوم التسجيل
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={
                      planForm.registrationFee
                    }
                    onChange={(event) =>
                      setPlanForm(
                        (current) => ({
                          ...current,
                          registrationFee:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  عدد الحصص
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    placeholder="فارغ = غير محدود"
                    value={
                      planForm.sessionsLimit
                    }
                    onChange={(event) =>
                      setPlanForm(
                        (current) => ({
                          ...current,
                          sessionsLimit:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  أيام التجميد
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={
                      planForm.freezeDaysAllowed
                    }
                    onChange={(event) =>
                      setPlanForm(
                        (current) => ({
                          ...current,
                          freezeDaysAllowed:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label className="billing-checkbox">
                  <input
                    type="checkbox"
                    checked={
                      planForm.isActive
                    }
                    onChange={(event) =>
                      setPlanForm(
                        (current) => ({
                          ...current,
                          isActive:
                            event.target
                              .checked,
                        }),
                      )
                    }
                  />
                  الخطة مفعلة
                </label>

                <label className="billing-full-field">
                  الوصف
                  <textarea
                    rows={3}
                    maxLength={1500}
                    value={
                      planForm.description
                    }
                    onChange={(event) =>
                      setPlanForm(
                        (current) => ({
                          ...current,
                          description:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>
              </div>

              <footer>
                <button
                  type="button"
                  className="billing-secondary-button"
                  onClick={() =>
                    setPlanModalOpen(false)
                  }
                  disabled={saving}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="billing-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'جارٍ الحفظ...'
                    : editingPlan
                      ? 'حفظ التعديلات'
                      : 'إنشاء الخطة'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {subscriptionModalOpen && (
        <div className="billing-overlay">
          <section className="billing-modal">
            <header>
              <div>
                <p>اشتراك المتدرب</p>
                <h2>
                  إنشاء اشتراك جديد
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSubscriptionModalOpen(
                    false,
                  )
                }
              >
                ×
              </button>
            </header>

            <form
              onSubmit={
                submitSubscription
              }
            >
              <div className="billing-form-grid">
                <label>
                  المتدرب
                  <select
                    required
                    value={
                      subscriptionForm
                        .traineeId
                    }
                    onChange={(event) =>
                      setSubscriptionForm(
                        (current) => ({
                          ...current,
                          traineeId:
                            event.target
                              .value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      اختر المتدرب
                    </option>

                    {referenceData.trainees.map(
                      (trainee) => (
                        <option
                          key={trainee.id}
                          value={trainee.id}
                        >
                          {trainee.firstName}{' '}
                          {trainee.lastName}
                          {' — '}
                          {
                            trainee.registrationCode
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  خطة الاشتراك
                  <select
                    required
                    value={
                      subscriptionForm
                        .planId
                    }
                    onChange={(event) =>
                      setSubscriptionForm(
                        (current) => ({
                          ...current,
                          planId:
                            event.target
                              .value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      اختر الخطة
                    </option>

                    {activePlans.map(
                      (plan) => (
                        <option
                          key={plan.id}
                          value={plan.id}
                        >
                          {plan.name}
                          {' — '}
                          {money(
                            plan.price +
                              plan.registrationFee,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  تاريخ البداية
                  <input
                    type="date"
                    value={
                      subscriptionForm
                        .startDate
                    }
                    onChange={(event) =>
                      setSubscriptionForm(
                        (current) => ({
                          ...current,
                          startDate:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  قيمة الخصم
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={
                      subscriptionForm
                        .discountAmount
                    }
                    onChange={(event) =>
                      setSubscriptionForm(
                        (current) => ({
                          ...current,
                          discountAmount:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label className="billing-full-field">
                  ملاحظات
                  <textarea
                    rows={3}
                    maxLength={1500}
                    value={
                      subscriptionForm.notes
                    }
                    onChange={(event) =>
                      setSubscriptionForm(
                        (current) => ({
                          ...current,
                          notes:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>
              </div>

              <div className="billing-subscription-preview">
                <div>
                  <span>المتدرب</span>
                  <strong>
                    {traineeName(
                      selectedSubscriptionTrainee,
                    )}
                  </strong>
                </div>

                <div>
                  <span>قيمة الخطة</span>
                  <strong>
                    {money(
                      (selectedSubscriptionPlan
                        ?.price ?? 0) +
                        (selectedSubscriptionPlan
                          ?.registrationFee ??
                          0),
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    الإجمالي بعد الخصم
                  </span>
                  <strong>
                    {money(
                      Math.max(
                        0,
                        (selectedSubscriptionPlan
                          ?.price ?? 0) +
                          (selectedSubscriptionPlan
                            ?.registrationFee ??
                            0) -
                          (Number(
                            subscriptionForm.discountAmount,
                          ) || 0),
                      ),
                    )}
                  </strong>
                </div>
              </div>

              <footer>
                <button
                  type="button"
                  className="billing-secondary-button"
                  disabled={saving}
                  onClick={() =>
                    setSubscriptionModalOpen(
                      false,
                    )
                  }
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="billing-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'جارٍ الإنشاء...'
                    : 'إنشاء الاشتراك'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {paymentSubscription && (
        <div className="billing-overlay">
          <section className="billing-modal billing-small-modal">
            <header>
              <div>
                <p>تسجيل دفعة</p>
                <h2>
                  {traineeName(
                    paymentSubscription.trainee,
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPaymentSubscription(
                    null,
                  )
                }
              >
                ×
              </button>
            </header>

            <form onSubmit={submitPayment}>
              <div className="billing-payment-summary">
                <div>
                  <span>إجمالي الاشتراك</span>
                  <strong>
                    {money(
                      paymentSubscription.totalAmount,
                    )}
                  </strong>
                </div>

                <div>
                  <span>المدفوع</span>
                  <strong>
                    {money(
                      paymentSubscription.paidAmount,
                    )}
                  </strong>
                </div>

                <div>
                  <span>المتبقي</span>
                  <strong>
                    {money(
                      paymentSubscription.balanceAmount,
                    )}
                  </strong>
                </div>
              </div>

              <div className="billing-form-grid">
                <label>
                  قيمة الدفعة
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={
                      paymentSubscription.balanceAmount
                    }
                    value={
                      paymentForm.amount
                    }
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          amount:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  طريقة الدفع
                  <select
                    value={
                      paymentForm.method
                    }
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          method:
                            event.target
                              .value as PaymentMethod,
                        }),
                      )
                    }
                  >
                    {Object.entries(
                      PAYMENT_METHOD_LABELS,
                    ).map(
                      ([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  تاريخ الدفع
                  <input
                    type="date"
                    value={
                      paymentForm.paidAt
                    }
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          paidAt:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  رقم المرجع
                  <input
                    maxLength={150}
                    value={
                      paymentForm.referenceNumber
                    }
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          referenceNumber:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label className="billing-full-field">
                  ملاحظات
                  <textarea
                    rows={3}
                    maxLength={1500}
                    value={
                      paymentForm.notes
                    }
                    onChange={(event) =>
                      setPaymentForm(
                        (current) => ({
                          ...current,
                          notes:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>
              </div>

              <footer>
                <button
                  type="button"
                  className="billing-secondary-button"
                  disabled={saving}
                  onClick={() =>
                    setPaymentSubscription(
                      null,
                    )
                  }
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="billing-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'جارٍ التسجيل...'
                    : 'تسجيل الدفعة'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {renewalSubscription && (
        <div className="billing-overlay">
          <section className="billing-modal billing-small-modal">
            <header>
              <div>
                <p>تجديد الاشتراك</p>
                <h2>
                  {traineeName(
                    renewalSubscription.trainee,
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRenewalSubscription(
                    null,
                  )
                }
              >
                ×
              </button>
            </header>

            <form onSubmit={submitRenewal}>
              <div className="billing-form-grid">
                <label>
                  الخطة الجديدة
                  <select
                    value={
                      renewalForm.planId
                    }
                    onChange={(event) =>
                      setRenewalForm(
                        (current) => ({
                          ...current,
                          planId:
                            event.target
                              .value,
                        }),
                      )
                    }
                  >
                    {activePlans.map(
                      (plan) => (
                        <option
                          key={plan.id}
                          value={plan.id}
                        >
                          {plan.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  تاريخ البداية
                  <input
                    type="date"
                    value={
                      renewalForm.startDate
                    }
                    onChange={(event) =>
                      setRenewalForm(
                        (current) => ({
                          ...current,
                          startDate:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label>
                  قيمة الخصم
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={
                      renewalForm.discountAmount
                    }
                    onChange={(event) =>
                      setRenewalForm(
                        (current) => ({
                          ...current,
                          discountAmount:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>

                <label className="billing-full-field">
                  ملاحظات
                  <textarea
                    rows={3}
                    maxLength={1500}
                    value={
                      renewalForm.notes
                    }
                    onChange={(event) =>
                      setRenewalForm(
                        (current) => ({
                          ...current,
                          notes:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </label>
              </div>

              <footer>
                <button
                  type="button"
                  className="billing-secondary-button"
                  disabled={saving}
                  onClick={() =>
                    setRenewalSubscription(
                      null,
                    )
                  }
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="billing-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'جارٍ التجديد...'
                    : 'تجديد الاشتراك'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {detailSubscription && (
        <div className="billing-overlay">
          <section className="billing-modal billing-details-modal">
            <header>
              <div>
                <p>
                  تفاصيل الاشتراك
                </p>

                <h2>
                  {traineeName(
                    detailSubscription.trainee,
                  )}
                </h2>

                <small>
                  {
                    detailSubscription.subscriptionNumber
                  }
                </small>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetailSubscription(null)
                }
              >
                ×
              </button>
            </header>

            <div className="billing-detail-summary">
              <article>
                <span>الخطة</span>
                <strong>
                  {detailSubscription.plan
                    ?.name ?? '—'}
                </strong>
              </article>

              <article>
                <span>الإجمالي</span>
                <strong>
                  {money(
                    detailSubscription.totalAmount,
                  )}
                </strong>
              </article>

              <article>
                <span>المدفوع</span>
                <strong>
                  {money(
                    detailSubscription.paidAmount,
                  )}
                </strong>
              </article>

              <article>
                <span>المتبقي</span>
                <strong>
                  {money(
                    detailSubscription.balanceAmount,
                  )}
                </strong>
              </article>
            </div>

            <section className="billing-payments-history">
              <h3>سجل المدفوعات</h3>

              {(detailSubscription.payments
                ?.length ?? 0) === 0 ? (
                <p>
                  لم يتم تسجيل دفعات حتى
                  الآن.
                </p>
              ) : (
                <div className="billing-payment-list">
                  {[...(detailSubscription.payments ??
                    [])]
                    .sort(
                      (first, second) =>
                        new Date(
                          second.paidAt,
                        ).getTime() -
                        new Date(
                          first.paidAt,
                        ).getTime(),
                    )
                    .map((payment) => (
                      <article
                        key={payment.id}
                      >
                        <div>
                          <strong>
                            {money(
                              payment.amount,
                            )}
                          </strong>

                          <span>
                            {
                              PAYMENT_METHOD_LABELS[
                                payment.method
                              ]
                            }
                          </span>
                        </div>

                        <div>
                          <strong>
                            {
                              payment.receiptNumber
                            }
                          </strong>

                          <span>
                            {dateTimeLabel(
                              payment.paidAt,
                            )}
                          </span>
                        </div>

                        <div>
                          <span>
                            استلمها:{' '}
                            {payment
                              .receivedByUser
                              ? `${payment.receivedByUser.firstName} ${payment.receivedByUser.lastName}`
                              : 'غير محدد'}
                          </span>
                        </div>
                      </article>
                    ))}
                </div>
              )}
            </section>

            <footer className="billing-details-footer">
              {Number(
                detailSubscription.balanceAmount,
              ) > 0 && (
                <button
                  type="button"
                  className="billing-primary-button"
                  onClick={() => {
                    setDetailSubscription(null);

                    openPayment(
                      detailSubscription,
                    );
                  }}
                >
                  تسجيل دفعة
                </button>
              )}

              <button
                type="button"
                className="billing-secondary-button"
                onClick={() =>
                  setDetailSubscription(null)
                }
              >
                إغلاق
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
