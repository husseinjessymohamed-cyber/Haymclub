import { IsIn } from 'class-validator';

export class UpdateSuperAdminAcademyStatusDto {
  @IsIn(['ACTIVE', 'TRIAL', 'SUSPENDED'])
  status: string;
}
