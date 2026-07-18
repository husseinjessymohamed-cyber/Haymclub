import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AcademyRole } from '../memberships/entities/academy-membership.entity';
import type { Trainee } from '../trainees/entities/trainee.entity';
import { TraineesService } from '../trainees/trainees.service';
import { BillingService } from './billing.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { CreateTraineeSubscriptionDto } from './dto/create-trainee-subscription.dto';
import { FindSubscriptionPlansQueryDto } from './dto/find-subscription-plans-query.dto';
import { FindSubscriptionsQueryDto } from './dto/find-subscriptions-query.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import type { SubscriptionPlan } from './entities/subscription-plan.entity';
import type { TraineeSubscription } from './entities/trainee-subscription.entity';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,

    private readonly traineesService: TraineesService,
  ) {}

  @Post('plans')
  @Roles(AcademyRole.SUPER_ADMIN, AcademyRole.ACADEMY_ADMIN)
  createPlan(
    @Body()
    dto: CreateSubscriptionPlanDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    this.assertAcademyAccess(currentUser, dto.academyId);

    return this.billingService.createPlan(dto);
  }

  @Get('plans')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
  )
  findPlans(
    @Query()
    query: FindSubscriptionPlansQueryDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === AcademyRole.SUPER_ADMIN) {
      return this.billingService.findPlans(query);
    }

    if (!currentUser.academyId) {
      return [];
    }

    return this.billingService.findPlans({
      ...query,
      academyId: currentUser.academyId,
    });
  }

  @Get('plans/:id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
  )
  async findPlan(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const plan = await this.billingService.findPlan(id);

    this.assertPlanAccess(currentUser, plan);

    return plan;
  }

  @Patch('plans/:id')
  @Roles(AcademyRole.SUPER_ADMIN, AcademyRole.ACADEMY_ADMIN)
  async updatePlan(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: UpdateSubscriptionPlanDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const plan = await this.billingService.findPlan(id);

    this.assertPlanAccess(currentUser, plan);

    return this.billingService.updatePlan(id, dto);
  }

  @Post('subscriptions')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
  )
  createSubscription(
    @Body()
    dto: CreateTraineeSubscriptionDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    this.assertAcademyAccess(currentUser, dto.academyId);

    this.assertBranchAccess(currentUser, dto.branchId);

    return this.billingService.createSubscription(dto);
  }

  @Get('subscriptions')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
  )
  findSubscriptions(
    @Query()
    query: FindSubscriptionsQueryDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === AcademyRole.SUPER_ADMIN) {
      return this.billingService.findSubscriptions(query);
    }

    if (!currentUser.academyId) {
      return [];
    }

    const filters = {
      ...query,
      academyId: currentUser.academyId,
    };

    if (
      currentUser.role === AcademyRole.BRANCH_MANAGER ||
      currentUser.role === AcademyRole.RECEPTIONIST ||
      currentUser.role === AcademyRole.ACCOUNTANT
    ) {
      filters.branchId = currentUser.branchId ?? undefined;
    }

    return this.billingService.findSubscriptions(filters);
  }

  @Get('subscriptions/:id')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
  )
  async findSubscription(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const subscription = await this.billingService.findSubscription(id);

    this.assertSubscriptionAccess(currentUser, subscription);

    return subscription;
  }

  @Post('subscriptions/:id/payments')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
  )
  async addPayment(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: CreatePaymentDto,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const subscription = await this.billingService.findSubscription(id);

    this.assertSubscriptionAccess(currentUser, subscription);

    return this.billingService.addPayment(id, dto, currentUser.sub);
  }

  @Get('subscriptions/:id/payments')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
  )
  async findPayments(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const subscription = await this.billingService.findSubscription(id);

    this.assertSubscriptionAccess(currentUser, subscription);

    return this.billingService.findPayments(id);
  }

  @Get('trainees/:traineeId/summary')
  @Roles(
    AcademyRole.SUPER_ADMIN,
    AcademyRole.ACADEMY_ADMIN,
    AcademyRole.BRANCH_MANAGER,
    AcademyRole.RECEPTIONIST,
    AcademyRole.ACCOUNTANT,
  )
  async getTraineeSummary(
    @Param('traineeId', new ParseUUIDPipe())
    traineeId: string,

    @CurrentUser()
    currentUser: JwtPayload,
  ) {
    const trainee = await this.traineesService.findOne(traineeId);

    this.assertTraineeAccess(currentUser, trainee);

    return this.billingService.getTraineeSummary(traineeId);
  }

  private assertAcademyAccess(
    currentUser: JwtPayload,
    academyId: string,
  ): void {
    if (
      currentUser.role !== AcademyRole.SUPER_ADMIN &&
      currentUser.academyId !== academyId
    ) {
      throw new ForbiddenException('You cannot access another academy');
    }
  }

  private assertBranchAccess(currentUser: JwtPayload, branchId: string): void {
    if (
      (currentUser.role === AcademyRole.BRANCH_MANAGER ||
        currentUser.role === AcademyRole.RECEPTIONIST ||
        currentUser.role === AcademyRole.ACCOUNTANT) &&
      currentUser.branchId !== branchId
    ) {
      throw new ForbiddenException('You cannot access another branch');
    }
  }

  private assertPlanAccess(
    currentUser: JwtPayload,
    plan: SubscriptionPlan,
  ): void {
    this.assertAcademyAccess(currentUser, plan.academyId);
  }

  private assertSubscriptionAccess(
    currentUser: JwtPayload,
    subscription: TraineeSubscription,
  ): void {
    this.assertAcademyAccess(currentUser, subscription.academyId);

    this.assertBranchAccess(currentUser, subscription.branchId);
  }

  private assertTraineeAccess(currentUser: JwtPayload, trainee: Trainee): void {
    this.assertAcademyAccess(currentUser, trainee.academyId);

    this.assertBranchAccess(currentUser, trainee.branchId);
  }
}
