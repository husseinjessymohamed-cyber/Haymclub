import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({
  name: 'super_admin_audit_logs',
})
export class SuperAdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: true,
  })
  actorUserId: string | null;

  @Index()
  @Column({
    type: 'varchar',
    length: 120,
  })
  action: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  entityType: string | null;

  @Column({
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  entityId: string | null;

  @Column({
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  metadata: Record<string, unknown>;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;
}
