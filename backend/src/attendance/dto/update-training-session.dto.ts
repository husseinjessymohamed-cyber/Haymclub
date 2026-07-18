import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { TrainingSessionStatus } from '../entities/training-session.entity';
import { CreateTrainingSessionDto } from './create-training-session.dto';

export class UpdateTrainingSessionDto extends PartialType(
  OmitType(CreateTrainingSessionDto, [
    'academyId',
    'branchId',
    'groupId',
    'generateRoster',
  ] as const),
) {
  @IsOptional()
  @IsEnum(TrainingSessionStatus)
  status?: TrainingSessionStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
