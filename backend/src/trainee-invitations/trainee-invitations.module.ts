import {
  Module,
} from '@nestjs/common';

import {
  PasswordResetModule,
} from '../password-reset/password-reset.module';

import {
  TraineesModule,
} from '../trainees/trainees.module';

import {
  TraineeInvitationsController,
} from './trainee-invitations.controller';

import {
  TraineeInvitationsService,
} from './trainee-invitations.service';

@Module({
  imports: [
    PasswordResetModule,
    TraineesModule,
  ],

  controllers: [
    TraineeInvitationsController,
  ],

  providers: [
    TraineeInvitationsService,
  ],

  exports: [
    TraineeInvitationsService,
  ],
})
export class TraineeInvitationsModule {}
