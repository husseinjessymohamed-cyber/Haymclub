import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { TraineeGender, TraineeStatus } from '../entities/trainee.entity';
import { AddGuardianDto } from './add-guardian.dto';

export class CreateTraineeDto {
  @IsUUID()
  academyId: string;

  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(60)
  registrationCode?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(TraineeGender)
  gender: TraineeGender;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  medicalNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  emergencyNotes?: string;

  @IsOptional()
  @IsEnum(TraineeStatus)
  status?: TraineeStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddGuardianDto)
  primaryGuardian?: AddGuardianDto;
}
