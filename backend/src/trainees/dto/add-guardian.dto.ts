import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { GuardianRelationship } from '../entities/trainee-guardian.entity';

export class AddGuardianDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsString()
  @Matches(/^[0-9+]{8,20}$/, {
    message: 'phone must contain numbers and may start with +',
  })
  phone: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsEnum(GuardianRelationship)
  relationship: GuardianRelationship;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  canPickup?: boolean;

  @IsOptional()
  @IsBoolean()
  receivesNotifications?: boolean;
}
