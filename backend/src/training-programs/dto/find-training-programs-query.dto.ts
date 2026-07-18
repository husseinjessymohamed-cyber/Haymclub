import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class FindTrainingProgramsQueryDto {
  @IsOptional()
  @IsUUID()
  academyId?: string;

  @IsOptional()
  @IsUUID()
  sportId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
