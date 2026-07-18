import { OmitType, PartialType } from '@nestjs/mapped-types';

import { CreateTrainingGroupDto } from './create-training-group.dto';

export class UpdateTrainingGroupDto extends PartialType(
  OmitType(CreateTrainingGroupDto, ['academyId', 'schedules'] as const),
) {}
