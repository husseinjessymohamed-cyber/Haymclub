import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAcademyManagerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @MaxLength(180)
  email: string;

  @IsString()
  @MinLength(7)
  @MaxLength(30)
  @Matches(
    /^\+?[0-9\s()-]+$/,
    {
      message:
        'رقم الهاتف يحتوي أرقامًا ورمز + فقط.',
    },
  )
  phone: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
