import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { AcademySaasSubscription } from './entities/academy-saas-subscription.entity';

import { SaasPayment } from './entities/saas-payment.entity';

import { SaasPlan } from './entities/saas-plan.entity';

import {
  SuperAdminAccessGuard,
  SuperAdminJwtGuard,
} from './super-admin-saas.guard';

import { SuperAdminSaasController } from './super-admin-saas.controller';

import { SuperAdminSaasService } from './super-admin-saas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaasPlan, AcademySaasSubscription, SaasPayment]),
  ],

  controllers: [SuperAdminSaasController],

  providers: [SuperAdminSaasService, SuperAdminJwtGuard, SuperAdminAccessGuard],
})
export class SuperAdminSaasModule {}
