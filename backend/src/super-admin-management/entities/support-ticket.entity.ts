import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'super_admin_support_tickets',
})
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    type: 'uuid',
    nullable: true,
  })
  academyId: string | null;

  @Column({
    type: 'varchar',
    length: 180,
  })
  subject: string;

  @Column({
    type: 'text',
  })
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'MEDIUM',
  })
  priority: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 30,
    default: 'OPEN',
  })
  status: string;

  @Column({
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  requesterEmail: string | null;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  assignedToUserId: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
  })
  updatedAt: Date;
}
