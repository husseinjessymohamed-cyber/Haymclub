import { OmitType, PartialType } from '@nestjs/mapped-types';

import { CreateTrainingProgramDto } from './create-training-program.dto';

export class UpdateTrainingProgramDto extends PartialType(
  OmitType(CreateTrainingProgramDto, ['academyId', 'sportId'] as const),
) {}
