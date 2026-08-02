import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { Academy } from '../../academies/entities/academy.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum NotificationAudience {
  ALL_TRAINEES = 'ALL_TRAINEES',
  BRANCH_TRAINEES = 'BRANCH_TRAINEES',
}

@Entity({
  name: 'academy_notifications',
})
@Index(
  'IDX_academy_notifications_academy',
  ['academyId'],
)
@Index(
  'IDX_academy_notifications_branch',
  ['branchId'],
)
@Index(
  'IDX_academy_notifications_published',
  ['publishedAt'],
)
export class AcademyNotification extends BaseEntity {
  @Column({
    name: 'academy_id',
    type: 'uuid',
  })
  academyId: string;

  @ManyToOne(() => Academy, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'academy_id',
  })
  academy: Academy;

  @Column({
    name: 'branch_id',
    type: 'uuid',
    nullable: true,
  })
  branchId: string | null;

  @ManyToOne(() => Branch, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'branch_id',
  })
  branch: Branch | null;

  @Column({
    name: 'sender_user_id',
    type: 'uuid',
  })
  senderUserId: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'sender_user_id',
  })
  sender: User;

  @Column({
    type: 'varchar',
    length: 180,
  })
  title: string;

  @Column({
    type: 'text',
  })
  body: string;

  @Column({
    type: 'varchar',
    length: 40,
    default:
      NotificationAudience.ALL_TRAINEES,
  })
  audience: NotificationAudience;

  @Column({
    name: 'published_at',
    type: 'timestamptz',
  })
  publishedAt: Date;
}
