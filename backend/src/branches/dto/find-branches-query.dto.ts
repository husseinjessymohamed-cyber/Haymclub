import { IsOptional, IsUUID } from 'class-validator';

export class FindBranchesQueryDto {
  @IsOptional()
  @IsUUID()
  academyId?: string;
}
