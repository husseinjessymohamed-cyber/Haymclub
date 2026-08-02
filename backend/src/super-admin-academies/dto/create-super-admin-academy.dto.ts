import { Transform } from 'class-transformer';

import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSuperAdminAcademyDto {
  @Transform(({ value }) => String(value).trim())
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

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
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'TRIAL', 'SUSPENDED'])
  status?: string;
}
