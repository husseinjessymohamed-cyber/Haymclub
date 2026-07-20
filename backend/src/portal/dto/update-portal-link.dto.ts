import {
  IsBoolean,
  IsEnum,
  IsOptional,
} from 'class-validator';

import {
  PortalRelationship,
} from '../entities/portal-trainee-link.entity';

export class UpdatePortalLinkDto {
  @IsOptional()
  @IsEnum(PortalRelationship)
  relationship?: PortalRelationship;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
