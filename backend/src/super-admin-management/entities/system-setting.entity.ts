import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'super_admin_system_settings',
})
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({
    unique: true,
  })
  @Column({
    type: 'varchar',
    length: 160,
    unique: true,
  })
  key: string;

  @Column({
    type: 'jsonb',
  })
  value: unknown;

  @Column({
    type: 'varchar',
    length: 80,
    default: 'GENERAL',
  })
  category: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  isPublic: boolean;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  updatedByUserId: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
  })
  updatedAt: Date;
}
