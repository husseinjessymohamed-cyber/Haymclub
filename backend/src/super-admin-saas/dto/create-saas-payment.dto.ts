import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateSaasPaymentDto {
  @IsUUID()
  academyId: string;

  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
