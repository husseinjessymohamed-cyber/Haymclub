import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(500)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/[A-Z]/, {
    message:
      'يجب أن تحتوي كلمة المرور على حرف إنجليزي كبير.',
  })
  @Matches(/[a-z]/, {
    message:
      'يجب أن تحتوي كلمة المرور على حرف إنجليزي صغير.',
  })
  @Matches(/[0-9]/, {
    message:
      'يجب أن تحتوي كلمة المرور على رقم.',
  })
  password: string;
}
