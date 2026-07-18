import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { Academy } from '../../academies/entities/academy.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { decimalNumberTransformer } from '../../common/transformers/decimal-number.transformer';
import { Sport } from '../../sports/entities/sport.entity';
import { TrainingProgram } from '../../training-programs/entities/training-program.entity';

@Entity({ name: 'subscription_plans' })
@Unique('UQ_subscription_plans_academy_code', ['academyId', 'code'])
export class SubscriptionPlan extends BaseEntity {
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
    nullable: true,
  })
  sportId: string | null;

  @ManyToOne(() => Sport, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'sport_id',
  })
  sport: Sport | null;

  @Column({
    name: 'program_id',
    type: 'uuid',
    nullable: true,
  })
  programId: string | null;

  @ManyToOne(() => TrainingProgram, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'program_id',
  })
  program: TrainingProgram | null;

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
    name: 'duration_days',
    type: 'integer',
  })
  durationDays: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalNumberTransformer,
  })
  price: number;

  @Column({
    name: 'registration_fee',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalNumberTransformer,
  })
  registrationFee: number;

  @Column({
    name: 'sessions_limit',
    type: 'integer',
    nullable: true,
  })
  sessionsLimit: number | null;

  @Column({
    name: 'freeze_days_allowed',
    type: 'integer',
    default: 0,
  })
  freezeDaysAllowed: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;
}
