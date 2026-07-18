import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateTrainingSessionDto {
  @IsUUID()
  academyId: string;

  @IsUUID()
  branchId: string;

  @IsUUID()
  groupId: string;

  @IsOptional()
  @IsUUID()
  coachId?: string | null;

  @IsDateString()
  sessionDate: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must use HH:mm format',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must use HH:mm format',
  })
  endTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  venueName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  generateRoster?: boolean;
}
