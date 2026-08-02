import { Transform } from 'class-transformer';

import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateSuperAdminAcademyDto {
  @IsOptional()
  @Transform(({ value }) => String(value).trim())
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => String(value).trim())
  @IsString()
  @MaxLength(180)
  legalName?: string;

  @IsOptional()
  @Transform(({ value }) => String(value).trim().toLowerCase())
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @Transform(({ value }) => String(value).trim().toLowerCase())
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;

  @IsOptional()
  @IsBoolean()
  attendanceEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  rankingsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  galleryEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  subscriptionsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  reportsEnabled?: boolean;

  @IsOptional()
  @IsIn(['ACTIVE', 'TRIAL', 'SUSPENDED'])
  status?: string;
}
