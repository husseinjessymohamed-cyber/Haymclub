import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity';
import { TrainingGroup } from './training-group.entity';

export enum TrainingDay {
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
}

@Entity({ name: 'training_group_schedules' })
@Unique('UQ_training_group_schedule_slot', [
  'groupId',
  'dayOfWeek',
  'startTime',
])
export class TrainingGroupSchedule extends BaseEntity {
  @Column({
    name: 'group_id',
    type: 'uuid',
  })
  groupId: string;

  @ManyToOne(() => TrainingGroup, (group) => group.schedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'group_id',
  })
  group: TrainingGroup;

  @Column({
    name: 'day_of_week',
    type: 'enum',
    enum: TrainingDay,
    enumName: 'training_day_enum',
  })
  dayOfWeek: TrainingDay;

  @Column({
    name: 'start_time',
    type: 'time',
  })
  startTime: string;

  @Column({
    name: 'end_time',
    type: 'time',
  })
  endTime: string;

  @Column({
    name: 'venue_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  venueName: string | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;
}
