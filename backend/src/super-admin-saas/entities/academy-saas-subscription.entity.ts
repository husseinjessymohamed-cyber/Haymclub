import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { decimalTransformer } from './decimal.transformer';

@Entity({
  name: 'academy_saas_subscriptions',
})
export class AcademySaasSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    type: 'uuid',
  })
  academyId: string;

  @Index()
  @Column({
    type: 'uuid',
  })
  planId: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'ACTIVE',
  })
  status: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'MONTHLY',
  })
  billingCycle: string;

  @Column({
    type: 'date',
  })
  startsAt: string;

  @Column({
    type: 'date',
  })
  endsAt: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  price: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  discount: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  paidAmount: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
  })
  updatedAt: Date;
}
