import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class FindSubscriptionPlansQueryDto {
  @IsOptional()
  @IsUUID()
  academyId?: string;

  @IsOptional()
  @IsUUID()
  sportId?: string;

  @IsOptional()
  @IsUUID()
  programId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
