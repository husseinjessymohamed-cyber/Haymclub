import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';

import { Academy } from '../../academies/entities/academy.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { TraineeGuardian } from './trainee-guardian.entity';

@Entity({ name: 'guardians' })
@Unique('UQ_guardians_academy_phone', ['academyId', 'phone'])
export class Guardian extends BaseEntity {
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
    type: 'varchar',
    length: 30,
  })
  phone: string;

  @Column({
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  email: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  address: string | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @OneToMany(() => TraineeGuardian, (link) => link.guardian)
  traineeLinks: TraineeGuardian[];
}
