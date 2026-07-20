import {
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class FindPortalLinksQueryDto {
  @IsOptional()
  @IsUUID()
  academyId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  traineeId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
