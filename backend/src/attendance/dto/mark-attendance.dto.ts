import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { AttendanceStatus } from '../entities/attendance-record.entity';

export class MarkAttendanceRecordDto {
  @IsUUID()
  traineeId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class BulkMarkAttendanceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({
    each: true,
  })
  @Type(() => MarkAttendanceRecordDto)
  records: MarkAttendanceRecordDto[];
}
