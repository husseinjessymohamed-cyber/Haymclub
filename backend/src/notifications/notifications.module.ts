import {
  Module,
} from '@nestjs/common';

import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  Branch,
} from '../branches/entities/branch.entity';

import {
  AcademyNotificationRead,
} from './entities/academy-notification-read.entity';

import {
  AcademyNotification,
} from './entities/academy-notification.entity';

import {
  NotificationsController,
} from './notifications.controller';

import {
  NotificationsService,
} from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademyNotification,
      AcademyNotificationRead,
      Branch,
    ]),
  ],

  controllers: [
    NotificationsController,
  ],

  providers: [
    NotificationsService,
  ],

  exports: [
    NotificationsService,
  ],
})
export class NotificationsModule {}
