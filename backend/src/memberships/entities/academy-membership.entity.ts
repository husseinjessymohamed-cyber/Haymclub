import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { Academy } from '../../academies/entities/academy.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum AcademyRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ACADEMY_ADMIN = 'ACADEMY_ADMIN',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  RECEPTIONIST = 'RECEPTIONIST',
  ACCOUNTANT = 'ACCOUNTANT',
  COACH = 'COACH',
  PARENT = 'PARENT',
  TRAINEE = 'TRAINEE',
}

@Entity({ name: 'academy_memberships' })
@Index('IDX_memberships_user', ['userId'])
@Index('IDX_memberships_academy', ['academyId'])
@Index('IDX_memberships_branch', ['branchId'])
export class AcademyMembership extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'uuid',
  })
  userId: string;

  @ManyToOne(() => User, (user) => user.memberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user: User;

  @Column({
    name: 'academy_id',
    type: 'uuid',
    nullable: true,
  })
  academyId: string | null;

  @ManyToOne(() => Academy, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'academy_id',
  })
  academy: Academy | null;

  @Column({
    name: 'branch_id',
    type: 'uuid',
    nullable: true,
  })
  branchId: string | null;

  @ManyToOne(() => Branch, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'branch_id',
  })
  branch: Branch | null;

  @Column({
    type: 'enum',
    enum: AcademyRole,
    enumName: 'academy_role_enum',
  })
  role: AcademyRole;

  @Column({
    name: 'is_primary',
    type: 'boolean',
    default: true,
  })
  isPrimary: boolean;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;
}
