import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTraineeRankingDto {
  @IsInt()
  @Min(0)
  @Max(1000000)
  points: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
