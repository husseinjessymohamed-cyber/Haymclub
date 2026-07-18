import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

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
  notes?: string;
}
