import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSportDto {
  @IsUUID()
  academyId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code must contain letters, numbers, underscores or hyphens only',
  })
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minimumAge?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maximumAge?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
