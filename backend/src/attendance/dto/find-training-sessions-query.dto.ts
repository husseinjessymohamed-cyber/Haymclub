import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { TrainingSessionStatus } from '../entities/training-session.entity';

export class FindTrainingSessionsQueryDto {
  @IsOptional()
  @IsUUID()
  academyId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUUID()
  coachId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(TrainingSessionStatus)
  status?: TrainingSessionStatus;
}
