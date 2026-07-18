import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSubscriptionPlanDto {
  @IsUUID()
  academyId: string;

  @IsOptional()
  @IsUUID()
  sportId?: string;

  @IsOptional()
  @IsUUID()
  programId?: string;

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

  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays: number;

  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  registrationFee?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  sessionsLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  freezeDaysAllowed?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
