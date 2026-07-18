import { OmitType, PartialType } from '@nestjs/mapped-types';

import { CreateTraineeDto } from './create-trainee.dto';

export class UpdateTraineeDto extends PartialType(
  OmitType(CreateTraineeDto, ['academyId', 'primaryGuardian'] as const),
) {}
