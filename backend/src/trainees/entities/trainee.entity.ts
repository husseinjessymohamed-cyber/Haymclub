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
import { GroupEnrollment } from './group-enrollment.entity';
import { TraineeGuardian } from './trainee-guardian.entity';

export enum TraineeGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum TraineeStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  INACTIVE = 'INACTIVE',
}

@Entity({ name: 'trainees' })
@Unique('UQ_trainees_academy_registration_code', [
  'academyId',
  'registrationCode',
])
export class Trainee extends BaseEntity {
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
    name: 'registration_code',
    type: 'varchar',
    length: 60,
  })
  registrationCode: string;

  @Column({
    name: 'first_name',
    type: 'varchar',
    length: 100,
  })
  firstName: string;

  @Column({
    name: 'last_name',
    type: 'varchar',
    length: 100,
  })
  lastName: string;

  @Column({
    name: 'date_of_birth',
    type: 'date',
  })
  dateOfBirth: string;

  @Column({
    type: 'enum',
    enum: TraineeGender,
    enumName: 'trainee_gender_enum',
  })
  gender: TraineeGender;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  phone: string | null;

  @Column({
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  email: string | null;

  @Column({
    name: 'medical_notes',
    type: 'text',
    nullable: true,
  })
  medicalNotes: string | null;

  @Column({
    name: 'emergency_notes',
    type: 'text',
    nullable: true,
  })
  emergencyNotes: string | null;

  @Column({
    type: 'enum',
    enum: TraineeStatus,
    enumName: 'trainee_status_enum',
    default: TraineeStatus.ACTIVE,
  })
  status: TraineeStatus;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @OneToMany(() => TraineeGuardian, (link) => link.trainee)
  guardianLinks: TraineeGuardian[];

  @OneToMany(() => GroupEnrollment, (enrollment) => enrollment.trainee)
  enrollments: GroupEnrollment[];
}
