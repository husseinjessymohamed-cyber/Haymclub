import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from '../../common/entities/base.entity';
import { Trainee } from '../../trainees/entities/trainee.entity';
import { TrainingSession } from './training-session.entity';

export enum AttendanceStatus {
  NOT_MARKED = 'NOT_MARKED',
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

@Entity({ name: 'attendance_records' })
@Unique('UQ_attendance_session_trainee', ['sessionId', 'traineeId'])
export class AttendanceRecord extends BaseEntity {
  @Column({
    name: 'academy_id',
    type: 'uuid',
  })
  academyId: string;

  @Column({
    name: 'session_id',
    type: 'uuid',
  })
  sessionId: string;

  @ManyToOne(() => TrainingSession, (session) => session.attendanceRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'session_id',
  })
  session: TrainingSession;

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
    enum: AttendanceStatus,
    enumName: 'attendance_status_enum',
    default: AttendanceStatus.NOT_MARKED,
  })
  status: AttendanceStatus;

  @Column({
    name: 'check_in_at',
    type: 'timestamptz',
    nullable: true,
  })
  checkInAt: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;
}
