import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import {
  PaymentMethod,
} from '../entities/payment.entity';

export class RenewSubscriptionDto {
  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  price?: number;

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
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  paymentAmount?: number;

  @ValidateIf(
    (dto: RenewSubscriptionDto) =>
      (dto.paymentAmount ?? 0) > 0,
  )
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  paymentNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  notes?: string;
}
