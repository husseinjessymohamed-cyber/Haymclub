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
import { TrainingProgram } from '../../training-programs/entities/training-program.entity';
import { User } from '../../users/entities/user.entity';
import { TrainingGroupSchedule } from './training-group-schedule.entity';

export enum TrainingGroupStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

@Entity({ name: 'training_groups' })
@Unique('UQ_training_groups_academy_code', ['academyId', 'code'])
export class TrainingGroup extends BaseEntity {
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
    name: 'program_id',
    type: 'uuid',
  })
  programId: string;

  @ManyToOne(() => TrainingProgram, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'program_id',
  })
  program: TrainingProgram;

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
    type: 'varchar',
    length: 160,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 60,
  })
  code: string;

  @Column({
    type: 'integer',
    default: 20,
  })
  capacity: number;

  @Column({
    type: 'enum',
    enum: TrainingGroupStatus,
    enumName: 'training_group_status_enum',
    default: TrainingGroupStatus.ACTIVE,
  })
  status: TrainingGroupStatus;

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

  @OneToMany(() => TrainingGroupSchedule, (schedule) => schedule.group)
  schedules: TrainingGroupSchedule[];
}
