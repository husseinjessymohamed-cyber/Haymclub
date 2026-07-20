import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import {
  PortalRelationship,
} from '../entities/portal-trainee-link.entity';

export class CreatePortalLinkDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  traineeId: string;

  @IsEnum(PortalRelationship)
  relationship: PortalRelationship;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
