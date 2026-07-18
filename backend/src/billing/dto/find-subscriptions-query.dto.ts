import { IsEnum, IsOptional, IsUUID } from 'class-validator';

import { TraineeSubscriptionStatus } from '../entities/trainee-subscription.entity';

export class FindSubscriptionsQueryDto {
  @IsOptional()
  @IsUUID()
  academyId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  traineeId?: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsEnum(TraineeSubscriptionStatus)
  status?: TraineeSubscriptionStatus;
}
