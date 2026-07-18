import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { Academy } from '../../academies/entities/academy.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { Sport } from '../../sports/entities/sport.entity';

export enum TrainingLevel {
  ALL_LEVELS = 'ALL_LEVELS',
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  PROFESSIONAL = 'PROFESSIONAL',
}

@Entity({ name: 'training_programs' })
@Unique('UQ_training_programs_academy_code', ['academyId', 'code'])
export class TrainingProgram extends BaseEntity {
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
    name: 'sport_id',
    type: 'uuid',
  })
  sportId: string;

  @ManyToOne(() => Sport, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'sport_id',
  })
  sport: Sport;

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
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @Column({
    type: 'enum',
    enum: TrainingLevel,
    enumName: 'training_level_enum',
    default: TrainingLevel.ALL_LEVELS,
  })
  level: TrainingLevel;

  @Column({
    name: 'minimum_age',
    type: 'smallint',
    nullable: true,
  })
  minimumAge: number | null;

  @Column({
    name: 'maximum_age',
    type: 'smallint',
    nullable: true,
  })
  maximumAge: number | null;

  @Column({
    name: 'sessions_per_week',
    type: 'smallint',
    default: 2,
  })
  sessionsPerWeek: number;

  @Column({
    name: 'session_duration_minutes',
    type: 'smallint',
    default: 60,
  })
  sessionDurationMinutes: number;

  @Column({
    type: 'integer',
    nullable: true,
  })
  capacity: number | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;
}
