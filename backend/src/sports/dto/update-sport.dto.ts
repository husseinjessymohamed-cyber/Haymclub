import { OmitType, PartialType } from '@nestjs/mapped-types';

import { CreateSportDto } from './create-sport.dto';

export class UpdateSportDto extends PartialType(
  OmitType(CreateSportDto, ['academyId'] as const),
) {}
