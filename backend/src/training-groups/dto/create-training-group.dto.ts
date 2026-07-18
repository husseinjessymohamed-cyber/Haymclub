import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { TrainingGroupStatus } from '../entities/training-group.entity';
import { CreateTrainingGroupScheduleDto } from './create-training-group-schedule.dto';

export class CreateTrainingGroupDto {
  @IsUUID()
  academyId: string;

  @IsUUID()
  branchId: string;

  @IsUUID()
  programId: string;

  @IsOptional()
  @IsUUID()
  coachId?: string | null;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code must contain letters, numbers, underscores or hyphens only',
  })
  code: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number;

  @IsOptional()
  @IsEnum(TrainingGroupStatus)
  status?: TrainingGroupStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(14)
  @ValidateNested({
    each: true,
  })
  @Type(() => CreateTrainingGroupScheduleDto)
  schedules?: CreateTrainingGroupScheduleDto[];
}
