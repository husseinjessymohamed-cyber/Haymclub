import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { Academy } from '../../academies/entities/academy.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { decimalNumberTransformer } from '../../common/transformers/decimal-number.transformer';
import { Trainee } from '../../trainees/entities/trainee.entity';
import { Payment } from './payment.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

export enum TraineeSubscriptionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'trainee_subscriptions' })
export class TraineeSubscription extends BaseEntity {
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
    name: 'plan_id',
    type: 'uuid',
  })
  planId: string;

  @ManyToOne(() => SubscriptionPlan, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'plan_id',
  })
  plan: SubscriptionPlan;

  @Column({
    name: 'subscription_number',
    type: 'varchar',
    length: 80,
    unique: true,
  })
  subscriptionNumber: string;

  @Column({
    name: 'start_date',
    type: 'date',
  })
  startDate: string;

  @Column({
    name: 'end_date',
    type: 'date',
  })
  endDate: string;

  @Column({
    type: 'enum',
    enum: TraineeSubscriptionStatus,
    enumName: 'trainee_subscription_status_enum',
    default: TraineeSubscriptionStatus.ACTIVE,
  })
  status: TraineeSubscriptionStatus;

  @Column({
    name: 'subtotal_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalNumberTransformer,
  })
  subtotalAmount: number;

  @Column({
    name: 'discount_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalNumberTransformer,
  })
  discountAmount: number;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalNumberTransformer,
  })
  totalAmount: number;

  @Column({
    name: 'paid_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalNumberTransformer,
  })
  paidAmount: number;

  @Column({
    name: 'balance_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalNumberTransformer,
  })
  balanceAmount: number;

  @Column({
    name: 'paid_in_full_at',
    type: 'timestamptz',
    nullable: true,
  })
  paidInFullAt: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;

  @OneToMany(() => Payment, (payment) => payment.subscription)
  payments: Payment[];
}
