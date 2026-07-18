import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity';
import { Guardian } from './guardian.entity';
import { Trainee } from './trainee.entity';

export enum GuardianRelationship {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  BROTHER = 'BROTHER',
  SISTER = 'SISTER',
  RELATIVE = 'RELATIVE',
  OTHER = 'OTHER',
}

@Entity({ name: 'trainee_guardians' })
@Unique('UQ_trainee_guardians_link', ['traineeId', 'guardianId'])
export class TraineeGuardian extends BaseEntity {
  @Column({
    name: 'academy_id',
    type: 'uuid',
  })
  academyId: string;

  @Column({
    name: 'trainee_id',
    type: 'uuid',
  })
  traineeId: string;

  @ManyToOne(() => Trainee, (trainee) => trainee.guardianLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'trainee_id',
  })
  trainee: Trainee;

  @Column({
    name: 'guardian_id',
    type: 'uuid',
  })
  guardianId: string;

  @ManyToOne(() => Guardian, (guardian) => guardian.traineeLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'guardian_id',
  })
  guardian: Guardian;

  @Column({
    type: 'enum',
    enum: GuardianRelationship,
    enumName: 'guardian_relationship_enum',
  })
  relationship: GuardianRelationship;

  @Column({
    name: 'is_primary',
    type: 'boolean',
    default: false,
  })
  isPrimary: boolean;

  @Column({
    name: 'can_pickup',
    type: 'boolean',
    default: true,
  })
  canPickup: boolean;

  @Column({
    name: 'receives_notifications',
    type: 'boolean',
    default: true,
  })
  receivesNotifications: boolean;
}
