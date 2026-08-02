import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { CreateAcademySaasSubscriptionDto } from './dto/create-academy-saas-subscription.dto';

import { CreateSaasPaymentDto } from './dto/create-saas-payment.dto';

import { CreateSaasPlanDto } from './dto/create-saas-plan.dto';

import { RenewAcademySaasSubscriptionDto } from './dto/renew-academy-saas-subscription.dto';

import { UpdateSaasPlanDto } from './dto/update-saas-plan.dto';

import { AcademySaasSubscription } from './entities/academy-saas-subscription.entity';

import { SaasPayment } from './entities/saas-payment.entity';

import { SaasPlan } from './entities/saas-plan.entity';

@Injectable()
export class SuperAdminSaasService {
  constructor(
    @InjectRepository(SaasPlan)
    private readonly plansRepository: Repository<SaasPlan>,

    @InjectRepository(AcademySaasSubscription)
    private readonly subscriptionsRepository: Repository<AcademySaasSubscription>,

    @InjectRepository(SaasPayment)
    private readonly paymentsRepository: Repository<SaasPayment>,
  ) {}

  findPlans() {
    return this.plansRepository.find({
      order: {
        monthlyPrice: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  async createPlan(dto: CreateSaasPlanDto) {
    const existing = await this.plansRepository.findOne({
      where: {
        code: dto.code,
      },
    });

    if (existing) {
      throw new ConflictException('A plan with this code already exists');
    }

    const plan = this.plansRepository.create({
      ...dto,
      maxBranches: dto.maxBranches ?? null,
      maxUsers: dto.maxUsers ?? null,
      maxTrainees: dto.maxTrainees ?? null,
      features: dto.features ?? {},
      isActive: dto.isActive ?? true,
    });

    return this.plansRepository.save(plan);
  }

  async updatePlan(id: string, dto: UpdateSaasPlanDto) {
    const plan = await this.plansRepository.findOne({
      where: {
        id,
      },
    });

    if (!plan) {
      throw new NotFoundException('SaaS plan not found');
    }

    if (dto.code && dto.code !== plan.code) {
      const duplicate = await this.plansRepository.findOne({
        where: {
          code: dto.code,
        },
      });

      if (duplicate) {
        throw new ConflictException('A plan with this code already exists');
      }
    }

    Object.assign(plan, dto);

    return this.plansRepository.save(plan);
  }

  async findSubscriptions() {
    const [subscriptions, plans] = await Promise.all([
      this.subscriptionsRepository.find({
        order: {
          createdAt: 'DESC',
        },
      }),

      this.plansRepository.find(),
    ]);

    const plansById = new Map(plans.map((plan) => [plan.id, plan]));

    return subscriptions.map((subscription) => ({
      ...subscription,

      planName: plansById.get(subscription.planId)?.name ?? '—',

      balanceAmount: Math.max(
        0,
        Number(subscription.price) -
          Number(subscription.discount) -
          Number(subscription.paidAmount),
      ),
    }));
  }

  async createSubscription(dto: CreateAcademySaasSubscriptionDto) {
    const plan = await this.plansRepository.findOne({
      where: {
        id: dto.planId,
      },
    });

    if (!plan) {
      throw new NotFoundException('SaaS plan not found');
    }

    const startsAt = dto.startsAt;

    const endsAt =
      dto.endsAt ??
      this.addMonths(startsAt, dto.billingCycle === 'YEARLY' ? 12 : 1);

    const defaultPrice =
      dto.billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;

    const subscription = this.subscriptionsRepository.create({
      academyId: dto.academyId,
      planId: dto.planId,
      billingCycle: dto.billingCycle,
      startsAt,
      endsAt,
      price: dto.price ?? defaultPrice,
      discount: dto.discount ?? 0,
      paidAmount: dto.paidAmount ?? 0,
      notes: dto.notes ?? null,
      status: this.resolveStatus(startsAt, endsAt),
    });

    return this.subscriptionsRepository.save(subscription);
  }

  async renewSubscription(id: string, dto: RenewAcademySaasSubscriptionDto) {
    const subscription = await this.subscriptionsRepository.findOne({
      where: {
        id,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Academy SaaS subscription not found');
    }

    const today = new Date().toISOString().slice(0, 10);

    const baseDate = subscription.endsAt > today ? subscription.endsAt : today;

    const months =
      dto.months ?? (subscription.billingCycle === 'YEARLY' ? 12 : 1);

    subscription.endsAt = this.addMonths(baseDate, months);

    subscription.status = 'ACTIVE';

    if (dto.paymentAmount && dto.paymentAmount > 0) {
      subscription.paidAmount =
        Number(subscription.paidAmount) + dto.paymentAmount;

      const payment = this.paymentsRepository.create({
        academyId: subscription.academyId,
        subscriptionId: subscription.id,
        amount: dto.paymentAmount,
        paymentMethod: 'CASH',
        reference: null,
        notes: 'Subscription renewal payment',
        paidAt: new Date(),
      });

      await this.paymentsRepository.save(payment);
    }

    return this.subscriptionsRepository.save(subscription);
  }

  findPayments() {
    return this.paymentsRepository.find({
      order: {
        paidAt: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async createPayment(dto: CreateSaasPaymentDto) {
    let subscription: AcademySaasSubscription | null = null;

    if (dto.subscriptionId) {
      subscription = await this.subscriptionsRepository.findOne({
        where: {
          id: dto.subscriptionId,
        },
      });

      if (!subscription) {
        throw new NotFoundException('Academy SaaS subscription not found');
      }
    }

    const payment = this.paymentsRepository.create({
      academyId: dto.academyId,
      subscriptionId: dto.subscriptionId ?? null,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod.trim().toUpperCase(),
      reference: dto.reference ?? null,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      notes: dto.notes ?? null,
    });

    const saved = await this.paymentsRepository.save(payment);

    if (subscription) {
      subscription.paidAmount = Number(subscription.paidAmount) + dto.amount;

      await this.subscriptionsRepository.save(subscription);
    }

    return saved;
  }

  private resolveStatus(startsAt: string, endsAt: string): string {
    const today = new Date().toISOString().slice(0, 10);

    if (endsAt < today) {
      return 'EXPIRED';
    }

    if (startsAt > today) {
      return 'PENDING';
    }

    return 'ACTIVE';
  }

  private addMonths(value: string, months: number): string {
    const date = new Date(`${value}T00:00:00.000Z`);

    date.setUTCMonth(date.getUTCMonth() + months);

    return date.toISOString().slice(0, 10);
  }
}
