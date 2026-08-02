import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSupportTicketDto {
  @IsOptional()
  @IsUUID()
  academyId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(180)
  subject: string;

  @IsString()
  @MinLength(5)
  description: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @IsOptional()
  @IsEmail()
  requesterEmail?: string;
}
