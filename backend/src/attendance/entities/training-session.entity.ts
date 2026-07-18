import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';

import { Academy } from '../../academies/entities/academy.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { TrainingGroup } from '../../training-groups/entities/training-group.entity';
import { User } from '../../users/entities/user.entity';
import { AttendanceRecord } from './attendance-record.entity';

export enum TrainingSessionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'training_sessions' })
@Unique('UQ_training_sessions_group_date_time', [
  'groupId',
  'sessionDate',
  'startTime',
])
export class TrainingSession extends BaseEntity {
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
  })
  branchId: string;

  @ManyToOne(() => Branch, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'branch_id',
  })
  branch: Branch;

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
    name: 'coach_id',
    type: 'uuid',
    nullable: true,
  })
  coachId: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'coach_id',
  })
  coach: User | null;

  @Column({
    name: 'session_date',
    type: 'date',
  })
  sessionDate: string;

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
    type: 'enum',
    enum: TrainingSessionStatus,
    enumName: 'training_session_status_enum',
    default: TrainingSessionStatus.SCHEDULED,
  })
  status: TrainingSessionStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @OneToMany(() => AttendanceRecord, (record) => record.session)
  attendanceRecords: AttendanceRecord[];
}
