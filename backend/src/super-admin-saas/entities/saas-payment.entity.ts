import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { decimalTransformer } from './decimal.transformer';

@Entity({
  name: 'saas_payments',
})
export class SaasPayment {
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
    nullable: true,
  })
  subscriptionId: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount: number;

  @Column({
    type: 'varchar',
    length: 40,
    default: 'CASH',
  })
  paymentMethod: string;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  reference: string | null;

  @Column({
    type: 'timestamptz',
  })
  paidAt: Date;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;
}
