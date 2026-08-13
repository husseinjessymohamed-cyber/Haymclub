import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  Throttle,
  ThrottlerGuard,
} from '@nestjs/throttler';

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

  // HAYMCLUB_PASSWORD_RESET_RATE_LIMIT_V1
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
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

  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  resetPassword(
    @Body()
    dto: ResetPasswordDto,
  ) {
    return this.passwordResetService
      .resetPassword(dto);
  }
}
