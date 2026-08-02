import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { decimalTransformer } from './decimal.transformer';

@Entity({
  name: 'saas_plans',
})
export class SaasPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 120,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 40,
    unique: true,
  })
  code: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  monthlyPrice: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  yearlyPrice: number;

  @Column({
    type: 'integer',
    nullable: true,
  })
  maxBranches: number | null;

  @Column({
    type: 'integer',
    nullable: true,
  })
  maxUsers: number | null;

  @Column({
    type: 'integer',
    nullable: true,
  })
  maxTrainees: number | null;

  @Column({
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  features: Record<string, boolean>;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
  })
  updatedAt: Date;
}
