import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { Academy } from '../../academies/entities/academy.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity({ name: 'branches' })
@Unique('UQ_branches_academy_code', ['academyId', 'code'])
export class Branch extends BaseEntity {
  @Column({
    name: 'academy_id',
    type: 'uuid',
  })
  academyId: string;

  @ManyToOne(() => Academy, (academy) => academy.branches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'academy_id',
  })
  academy: Academy;

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
    type: 'varchar',
    length: 160,
    nullable: true,
  })
  email: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  phone: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  address: string | null;

  @Column({
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  governorate: string | null;

  @Column({
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  city: string | null;

  @Column({
    name: 'is_main',
    type: 'boolean',
    default: false,
  })
  isMain: boolean;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;
}
