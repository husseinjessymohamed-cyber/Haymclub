import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  NotificationAudience,
} from '../entities/academy-notification.entity';

export class CreateNotificationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  body: string;

  @IsEnum(NotificationAudience)
  audience: NotificationAudience;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
