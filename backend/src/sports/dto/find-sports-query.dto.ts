import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class FindSportsQueryDto {
  @IsOptional()
  @IsUUID()
  academyId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
