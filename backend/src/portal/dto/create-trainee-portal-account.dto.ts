import {
  IsUUID,
} from 'class-validator';

export class CreateTraineePortalAccountDto {
  @IsUUID()
  traineeId: string;
}
