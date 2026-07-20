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
