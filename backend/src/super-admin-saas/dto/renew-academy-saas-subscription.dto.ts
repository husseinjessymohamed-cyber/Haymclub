import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class RenewAcademySaasSubscriptionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  months?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentAmount?: number;
}
