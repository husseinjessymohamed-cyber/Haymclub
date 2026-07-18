import { OmitType, PartialType } from '@nestjs/mapped-types';

import { CreateBranchDto } from './create-branch.dto';

export class UpdateBranchDto extends PartialType(
  OmitType(CreateBranchDto, ['academyId'] as const),
) {}
