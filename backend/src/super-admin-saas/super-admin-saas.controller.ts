import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateAcademySaasSubscriptionDto } from './dto/create-academy-saas-subscription.dto';

import { CreateSaasPaymentDto } from './dto/create-saas-payment.dto';

import { CreateSaasPlanDto } from './dto/create-saas-plan.dto';

import { RenewAcademySaasSubscriptionDto } from './dto/renew-academy-saas-subscription.dto';

import { UpdateSaasPlanDto } from './dto/update-saas-plan.dto';

import {
  SuperAdminAccessGuard,
  SuperAdminJwtGuard,
} from './super-admin-saas.guard';

import { SuperAdminSaasService } from './super-admin-saas.service';

@Controller('super-admin/saas')
@UseGuards(SuperAdminJwtGuard, SuperAdminAccessGuard)
export class SuperAdminSaasController {
  constructor(private readonly service: SuperAdminSaasService) {}

  @Get('plans')
  findPlans() {
    return this.service.findPlans();
  }

  @Post('plans')
  createPlan(
    @Body()
    dto: CreateSaasPlanDto,
  ) {
    return this.service.createPlan(dto);
  }

  @Patch('plans/:id')
  updatePlan(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: UpdateSaasPlanDto,
  ) {
    return this.service.updatePlan(id, dto);
  }

  @Get('subscriptions')
  findSubscriptions() {
    return this.service.findSubscriptions();
  }

  @Post('subscriptions')
  createSubscription(
    @Body()
    dto: CreateAcademySaasSubscriptionDto,
  ) {
    return this.service.createSubscription(dto);
  }

  @Post('subscriptions/:id/renew')
  renewSubscription(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: RenewAcademySaasSubscriptionDto,
  ) {
    return this.service.renewSubscription(id, dto);
  }

  @Get('payments')
  findPayments() {
    return this.service.findPayments();
  }

  @Post('payments')
  createPayment(
    @Body()
    dto: CreateSaasPaymentDto,
  ) {
    return this.service.createPayment(dto);
  }
}
