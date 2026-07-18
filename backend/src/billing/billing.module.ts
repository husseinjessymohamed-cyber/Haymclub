import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AcademiesModule } from '../academies/academies.module';
import { BranchesModule } from '../branches/branches.module';
import { SportsModule } from '../sports/sports.module';
import { TraineesModule } from '../trainees/trainees.module';
import { TrainingProgramsModule } from '../training-programs/training-programs.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Payment } from './entities/payment.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { TraineeSubscription } from './entities/trainee-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPlan, TraineeSubscription, Payment]),
    AcademiesModule,
    BranchesModule,
    SportsModule,
    TrainingProgramsModule,
    TraineesModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
