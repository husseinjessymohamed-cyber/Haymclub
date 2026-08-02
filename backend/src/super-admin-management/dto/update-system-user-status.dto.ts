import { IsString, MaxLength } from 'class-validator';

export class UpdateSystemUserStatusDto {
  @IsString()
  @MaxLength(40)
  status: string;
}
