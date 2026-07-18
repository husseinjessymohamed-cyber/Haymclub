import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity';
import { TrainingGroup } from '../../training-groups/entities/training-group.entity';
import { Trainee } from './trainee.entity';

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  WAITLISTED = 'WAITLISTED',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'group_enrollments' })
@Unique('UQ_group_enrollments_trainee_group', ['traineeId', 'groupId'])
export class GroupEnrollment extends BaseEntity {
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

  @ManyToOne(() => Trainee, (trainee) => trainee.enrollments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'trainee_id',
  })
  trainee: Trainee;

  @Column({
    name: 'group_id',
    type: 'uuid',
  })
  groupId: string;

  @ManyToOne(() => TrainingGroup, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'group_id',
  })
  group: TrainingGroup;

  @Column({
    name: 'enrollment_date',
    type: 'date',
  })
  enrollmentDate: string;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    enumName: 'enrollment_status_enum',
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;
}
