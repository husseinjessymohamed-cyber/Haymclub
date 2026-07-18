import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { Academy } from '../../academies/entities/academy.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { decimalNumberTransformer } from '../../common/transformers/decimal-number.transformer';
import { Trainee } from '../../trainees/entities/trainee.entity';
import { User } from '../../users/entities/user.entity';
import { TraineeSubscription } from './trainee-subscription.entity';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  INSTAPAY = 'INSTAPAY',
  VODAFONE_CASH = 'VODAFONE_CASH',
  OTHER = 'OTHER',
}

@Entity({ name: 'payments' })
export class Payment extends BaseEntity {
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
    name: 'subscription_id',
    type: 'uuid',
  })
  subscriptionId: string;

  @ManyToOne(
    () => TraineeSubscription,
    (subscription) => subscription.payments,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'subscription_id',
  })
  subscription: TraineeSubscription;

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
    name: 'received_by_user_id',
    type: 'uuid',
    nullable: true,
  })
  receivedByUserId: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'received_by_user_id',
  })
  receivedByUser: User | null;

  @Column({
    name: 'payment_number',
    type: 'varchar',
    length: 80,
    unique: true,
  })
  paymentNumber: string;

  @Column({
    name: 'receipt_number',
    type: 'varchar',
    length: 80,
    unique: true,
  })
  receiptNumber: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalNumberTransformer,
  })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'payment_method_enum',
  })
  method: PaymentMethod;

  @Column({
    name: 'paid_at',
    type: 'timestamptz',
  })
  paidAt: Date;

  @Column({
    name: 'reference_number',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  referenceNumber: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;
}
