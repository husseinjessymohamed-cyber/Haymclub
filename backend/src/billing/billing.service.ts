import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';

import { AcademiesService } from '../academies/academies.service';
import { BranchesService } from '../branches/branches.service';
import { SportsService } from '../sports/sports.service';
import { TraineesService } from '../trainees/trainees.service';
import { TrainingProgramsService } from '../training-programs/training-programs.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { CreateTraineeSubscriptionDto } from './dto/create-trainee-subscription.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { Payment } from './entities/payment.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import {
  TraineeSubscription,
  TraineeSubscriptionStatus,
} from './entities/trainee-subscription.entity';

export interface SubscriptionPlanFilters {
  academyId?: string;
  sportId?: string;
  programId?: string;
  isActive?: boolean;
}

export interface SubscriptionFilters {
  academyId?: string;
  branchId?: string;
  traineeId?: string;
  planId?: string;
  status?: TraineeSubscriptionStatus;
}

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly plansRepository: Repository<SubscriptionPlan>,

    @InjectRepository(TraineeSubscription)
    private readonly subscriptionsRepository: Repository<TraineeSubscription>,

    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,

    private readonly dataSource: DataSource,
    private readonly academiesService: AcademiesService,
    private readonly branchesService: BranchesService,
    private readonly traineesService: TraineesService,
    private readonly sportsService: SportsService,
    private readonly programsService: TrainingProgramsService,
  ) {}

  async createPlan(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    await this.academiesService.findOne(dto.academyId);

    await this.validatePlanRelations(
      dto.academyId,
      dto.sportId ?? null,
      dto.programId ?? null,
    );

    const plan = this.plansRepository.create({
      academyId: dto.academyId,
      sportId: dto.sportId ?? null,
      programId: dto.programId ?? null,
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      description: dto.description?.trim() || null,
      durationDays: dto.durationDays,
      price: this.roundMoney(dto.price),
      registrationFee: this.roundMoney(dto.registrationFee ?? 0),
      sessionsLimit: dto.sessionsLimit ?? null,
      freezeDaysAllowed: dto.freezeDaysAllowed ?? 0,
      isActive: dto.isActive ?? true,
    });

    try {
      return await this.plansRepository.save(plan);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  findPlans(filters: SubscriptionPlanFilters): Promise<SubscriptionPlan[]> {
    const where: FindOptionsWhere<SubscriptionPlan> = {};

    if (filters.academyId) {
      where.academyId = filters.academyId;
    }

    if (filters.sportId) {
      where.sportId = filters.sportId;
    }

    if (filters.programId) {
      where.programId = filters.programId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.plansRepository.find({
      where,
      relations: {
        sport: true,
        program: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findPlan(id: string): Promise<SubscriptionPlan> {
    const plan = await this.plansRepository.findOne({
      where: {
        id,
      },
      relations: {
        sport: true,
        program: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  async updatePlan(
    id: string,
    dto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    const plan = await this.findPlan(id);

    const sportId = dto.sportId !== undefined ? dto.sportId : plan.sportId;

    const programId =
      dto.programId !== undefined ? dto.programId : plan.programId;

    await this.validatePlanRelations(
      plan.academyId,
      sportId ?? null,
      programId ?? null,
    );

    const updated = this.plansRepository.merge(plan, {
      ...dto,
      sportId: sportId ?? null,
      programId: programId ?? null,
      name: dto.name ? dto.name.trim() : plan.name,
      code: dto.code ? dto.code.trim().toUpperCase() : plan.code,
      description:
        dto.description !== undefined
          ? dto.description.trim() || null
          : plan.description,
      price: dto.price !== undefined ? this.roundMoney(dto.price) : plan.price,
      registrationFee:
        dto.registrationFee !== undefined
          ? this.roundMoney(dto.registrationFee)
          : plan.registrationFee,
    });

    try {
      await this.plansRepository.save(updated);

      return await this.findPlan(id);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async createSubscription(
    dto: CreateTraineeSubscriptionDto,
  ): Promise<TraineeSubscription> {
    const trainee = await this.traineesService.findOne(dto.traineeId);

    if (trainee.academyId !== dto.academyId) {
      throw new BadRequestException(
        'Trainee does not belong to the selected academy',
      );
    }

    if (trainee.branchId !== dto.branchId) {
      throw new BadRequestException(
        'Trainee does not belong to the selected branch',
      );
    }

    const branch = await this.branchesService.findOne(dto.branchId);

    if (branch.academyId !== dto.academyId) {
      throw new BadRequestException(
        'Branch does not belong to the selected academy',
      );
    }

    const plan = await this.findPlan(dto.planId);

    if (plan.academyId !== dto.academyId) {
      throw new BadRequestException(
        'Subscription plan does not belong to the selected academy',
      );
    }

    if (!plan.isActive) {
      throw new BadRequestException('Subscription plan is not active');
    }

    const subtotalAmount = this.roundMoney(plan.price + plan.registrationFee);

    const discountAmount = this.roundMoney(dto.discountAmount ?? 0);

    if (discountAmount > subtotalAmount) {
      throw new BadRequestException(
        'Discount cannot exceed subscription subtotal',
      );
    }

    const totalAmount = this.roundMoney(subtotalAmount - discountAmount);

    const startDate = dto.startDate ?? new Date().toISOString().slice(0, 10);

    const endDate = this.addDays(startDate, plan.durationDays);

    const subscription = this.subscriptionsRepository.create({
      academyId: dto.academyId,
      branchId: dto.branchId,
      traineeId: dto.traineeId,
      planId: dto.planId,
      subscriptionNumber: this.generateNumber('SUB'),
      startDate,
      endDate,
      status: TraineeSubscriptionStatus.ACTIVE,
      subtotalAmount,
      discountAmount,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      paidInFullAt: totalAmount === 0 ? new Date() : null,
      notes: dto.notes?.trim() || null,
    });

    try {
      const saved = await this.subscriptionsRepository.save(subscription);

      return await this.findSubscription(saved.id);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  findSubscriptions(
    filters: SubscriptionFilters,
  ): Promise<TraineeSubscription[]> {
    const where: FindOptionsWhere<TraineeSubscription> = {};

    if (filters.academyId) {
      where.academyId = filters.academyId;
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.traineeId) {
      where.traineeId = filters.traineeId;
    }

    if (filters.planId) {
      where.planId = filters.planId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return this.subscriptionsRepository.find({
      where,
      relations: {
        trainee: true,
        branch: true,
        plan: {
          sport: true,
          program: true,
        },
        payments: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findSubscription(id: string): Promise<TraineeSubscription> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: {
        id,
      },
      relations: {
        trainee: true,
        branch: true,
        plan: {
          sport: true,
          program: true,
        },
        payments: {
          receivedByUser: true,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Trainee subscription not found');
    }

    return subscription;
  }

  async addPayment(
    subscriptionId: string,
    dto: CreatePaymentDto,
    receivedByUserId: string,
  ): Promise<TraineeSubscription> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const subscriptionsRepository =
          manager.getRepository(TraineeSubscription);

        const paymentsRepository = manager.getRepository(Payment);

        const subscription = await subscriptionsRepository.findOne({
          where: {
            id: subscriptionId,
          },
          lock: {
            mode: 'pessimistic_write',
          },
        });

        if (!subscription) {
          throw new NotFoundException('Trainee subscription not found');
        }

        if (subscription.status === TraineeSubscriptionStatus.CANCELLED) {
          throw new BadRequestException(
            'Payment cannot be added to a cancelled subscription',
          );
        }

        const amount = this.roundMoney(dto.amount);

        if (amount > subscription.balanceAmount) {
          throw new BadRequestException(
            'Payment amount exceeds the outstanding balance',
          );
        }

        const paymentNumber = this.generateNumber('PAY');

        const payment = paymentsRepository.create({
          academyId: subscription.academyId,
          branchId: subscription.branchId,
          subscriptionId: subscription.id,
          traineeId: subscription.traineeId,
          receivedByUserId,
          paymentNumber,
          receiptNumber: paymentNumber.replace('PAY', 'REC'),
          amount,
          method: dto.method,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          referenceNumber: dto.referenceNumber?.trim() || null,
          notes: dto.notes?.trim() || null,
        });

        await paymentsRepository.save(payment);

        subscription.paidAmount = this.roundMoney(
          subscription.paidAmount + amount,
        );

        subscription.balanceAmount = this.roundMoney(
          subscription.totalAmount - subscription.paidAmount,
        );

        if (subscription.balanceAmount === 0) {
          subscription.paidInFullAt = new Date();
        }

        await subscriptionsRepository.save(subscription);
      });

      return await this.findSubscription(subscriptionId);
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findPayments(subscriptionId: string): Promise<Payment[]> {
    await this.findSubscription(subscriptionId);

    return this.paymentsRepository.find({
      where: {
        subscriptionId,
      },
      relations: {
        receivedByUser: true,
      },
      order: {
        paidAt: 'DESC',
      },
    });
  }

  async getTraineeSummary(traineeId: string) {
    const trainee = await this.traineesService.findOne(traineeId);

    const subscriptions = await this.subscriptionsRepository.find({
      where: {
        traineeId,
      },
      relations: {
        plan: true,
        payments: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const totals = subscriptions.reduce(
      (result, subscription) => {
        result.totalAmount = this.roundMoney(
          result.totalAmount + subscription.totalAmount,
        );

        result.paidAmount = this.roundMoney(
          result.paidAmount + subscription.paidAmount,
        );

        result.balanceAmount = this.roundMoney(
          result.balanceAmount + subscription.balanceAmount,
        );

        return result;
      },
      {
        totalAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
      },
    );

    return {
      trainee: {
        id: trainee.id,
        registrationCode: trainee.registrationCode,
        firstName: trainee.firstName,
        lastName: trainee.lastName,
      },
      totals,
      subscriptions,
    };
  }

  private async validatePlanRelations(
    academyId: string,
    sportId: string | null,
    programId: string | null,
  ): Promise<void> {
    let sportAcademyId: string | null = null;

    if (sportId) {
      const sport = await this.sportsService.findOne(sportId);

      if (sport.academyId !== academyId) {
        throw new BadRequestException(
          'Sport does not belong to the selected academy',
        );
      }

      sportAcademyId = sport.academyId;
    }

    if (programId) {
      const program = await this.programsService.findOne(programId);

      if (program.academyId !== academyId) {
        throw new BadRequestException(
          'Training program does not belong to the selected academy',
        );
      }

      if (sportId && program.sportId !== sportId) {
        throw new BadRequestException(
          'Training program does not belong to the selected sport',
        );
      }

      sportAcademyId = program.academyId;
    }

    if (sportAcademyId && sportAcademyId !== academyId) {
      throw new BadRequestException('Invalid subscription plan relations');
    }
  }

  private addDays(date: string, days: number): string {
    const result = new Date(`${date}T00:00:00Z`);

    result.setUTCDate(result.getUTCDate() + days);

    return result.toISOString().slice(0, 10);
  }

  private generateNumber(prefix: string): string {
    return `${prefix}-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private handleDatabaseError(error: unknown): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }

    const postgresCode = (
      error as {
        driverError?: {
          code?: string;
        };
      }
    )?.driverError?.code;

    if (error instanceof QueryFailedError && postgresCode === '23505') {
      throw new ConflictException(
        'Plan code, subscription number or payment number already exists',
      );
    }

    if (error instanceof QueryFailedError && postgresCode === '23503') {
      throw new NotFoundException(
        'Related academy, branch, trainee or plan was not found',
      );
    }

    throw error;
  }
}
