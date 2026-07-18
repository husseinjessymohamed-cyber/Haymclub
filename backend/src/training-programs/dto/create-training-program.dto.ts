import {
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
} from 'class-validator';

import { TrainingLevel } from '../entities/training-program.entity';

export class CreateTrainingProgramDto {
  @IsUUID()
  academyId: string;

  @IsUUID()
  sportId: string;

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
  @IsString()
  @MaxLength(1500)
  description?: string;

  @IsOptional()
  @IsEnum(TrainingLevel)
  level?: TrainingLevel;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minimumAge?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maximumAge?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  sessionsPerWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(360)
  sessionDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
