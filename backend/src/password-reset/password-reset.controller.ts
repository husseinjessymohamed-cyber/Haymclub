import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import {
  Public,
} from '../auth/decorators/public.decorator';

import {
  ForgotPasswordDto,
} from './dto/forgot-password.dto';

import {
  ResetPasswordDto,
} from './dto/reset-password.dto';

import {
  PasswordResetService,
} from './password-reset.service';

@Controller('auth')
export class PasswordResetController {
  constructor(
    private readonly passwordResetService:
      PasswordResetService,
  ) {}

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(
    @Body()
    dto: ForgotPasswordDto,
  ) {
    return this.passwordResetService
      .forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body()
    dto: ResetPasswordDto,
  ) {
    return this.passwordResetService
      .resetPassword(dto);
  }
}
