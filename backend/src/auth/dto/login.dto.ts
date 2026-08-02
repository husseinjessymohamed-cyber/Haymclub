import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  /**
   * يبقى اسم الحقل email للحفاظ على توافق الواجهة الحالية،
   * لكنه يقبل بريدًا إلكترونيًا أو رقم هاتف.
   */
  @IsString()
  @MinLength(5)
  @MaxLength(180)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
