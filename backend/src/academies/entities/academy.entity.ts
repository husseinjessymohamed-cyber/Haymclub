import { Column, Entity, OneToMany } from 'typeorm';

import { Branch } from '../../branches/entities/branch.entity';
import { BaseEntity } from '../../common/entities/base.entity';

export enum AcademyStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity({ name: 'academies' })
export class Academy extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 160,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 120,
    unique: true,
  })
  slug: string;

  @Column({
    name: 'legal_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  legalName: string | null;

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
    name: 'logo_url',
    type: 'text',
    nullable: true,
  })
  logoUrl: string | null;

  @Column({
    type: 'varchar',
    length: 80,
    default: 'Africa/Cairo',
  })
  timezone: string;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'EGP',
  })
  currency: string;

  @Column({
    type: 'enum',
    enum: AcademyStatus,
    enumName: 'academy_status_enum',
    default: AcademyStatus.TRIAL,
  })
  status: AcademyStatus;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @OneToMany(() => Branch, (branch) => branch.academy)
  branches: Branch[];
}
