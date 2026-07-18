import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTraineeSubscriptionDto {
  @IsUUID()
  academyId: string;

  @IsUUID()
  branchId: string;

  @IsUUID()
  traineeId: string;

  @IsUUID()
  planId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  notes?: string;
}
