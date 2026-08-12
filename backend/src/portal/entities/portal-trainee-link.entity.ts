import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';

import { Academy } from '../../academies/entities/academy.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { Trainee } from '../../trainees/entities/trainee.entity';
import { User } from '../../users/entities/user.entity';

export enum PortalRelationship {
  SELF = 'SELF',
  PARENT = 'PARENT',
  GUARDIAN = 'GUARDIAN',
}

@Entity({
  name: 'portal_trainee_links',
})
@Unique(
  'UQ_portal_links_user_trainee',
  ['userId', 'traineeId'],
)
@Index(
  'IDX_portal_links_user',
  ['userId'],
)
@Index(
  'IDX_portal_links_trainee',
  ['traineeId'],
)
@Index(
  'IDX_portal_links_academy',
  ['academyId'],
)

// HAYMCLUB_PORTAL_CONCURRENCY_INDEXES_V1
//
// Exactly one active/non-deleted SELF portal link
// is allowed per trainee.
//
// Exactly one non-deleted primary portal link
// is allowed per user.
@Index(
  'UQ_portal_links_single_self_per_trainee',
  ['traineeId'],
  {
    unique: true,

    where:
      `"relationship" = 'SELF' AND "deleted_at" IS NULL`,
  },
)
@Index(
  'UQ_portal_links_single_primary_per_user',
  ['userId'],
  {
    unique: true,

    where:
      `"is_primary" = true AND "deleted_at" IS NULL`,
  },
)
export class PortalTraineeLink extends BaseEntity {
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
    name: 'trainee_id',
    type: 'uuid',
  })
  traineeId: string;

  @ManyToOne(() => Trainee, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'trainee_id',
  })
  trainee: Trainee;

  @Column({
    type: 'enum',
    enum: PortalRelationship,
    enumName: 'portal_relationship_enum',
  })
  relationship: PortalRelationship;

  @Column({
    name: 'is_primary',
    type: 'boolean',
    default: false,
  })
  isPrimary: boolean;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;
}
