import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { AcademyNotification } from './academy-notification.entity';

@Entity({
  name: 'academy_notification_reads',
})
@Index(
  'UQ_academy_notification_reads_pair',
  ['notificationId', 'userId'],
  {
    unique: true,
  },
)
@Index(
  'IDX_academy_notification_reads_user',
  ['userId'],
)
export class AcademyNotificationRead extends BaseEntity {
  @Column({
    name: 'notification_id',
    type: 'uuid',
  })
  notificationId: string;

  @ManyToOne(
    () => AcademyNotification,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'notification_id',
  })
  notification: AcademyNotification;

  @Column({
    name: 'user_id',
    type: 'uuid',
  })
  userId: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user: User;

  @Column({
    name: 'read_at',
    type: 'timestamptz',
  })
  readAt: Date;
}
