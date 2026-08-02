import {
  Module,
} from '@nestjs/common';

import {
  ConfigModule,
} from '@nestjs/config';

import {
  MailModule,
} from '../mail/mail.module';

import {
  PasswordResetController,
} from './password-reset.controller';

import {
  PasswordResetService,
} from './password-reset.service';

@Module({
  imports: [
    ConfigModule,
    MailModule,
  ],

  controllers: [
    PasswordResetController,
  ],

  providers: [
    PasswordResetService,
  ],

  exports: [
    PasswordResetService,
  ],
})
export class PasswordResetModule {}
