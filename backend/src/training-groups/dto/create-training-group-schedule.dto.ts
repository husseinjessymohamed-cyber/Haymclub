import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import { TrainingDay } from '../entities/training-group-schedule.entity';

export class CreateTrainingGroupScheduleDto {
  @IsEnum(TrainingDay)
  dayOfWeek: TrainingDay;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must use HH:mm format',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must use HH:mm format',
  })
  endTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  venueName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
