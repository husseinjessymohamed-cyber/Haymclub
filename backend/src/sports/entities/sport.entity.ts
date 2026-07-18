import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { Academy } from '../../academies/entities/academy.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity({ name: 'sports' })
@Unique('UQ_sports_academy_code', ['academyId', 'code'])
export class Sport extends BaseEntity {
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
    type: 'varchar',
    length: 120,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  code: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

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
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;
}
