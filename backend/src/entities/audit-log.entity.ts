import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ length: 60 }) username!: string;
  @Index() @Column({ length: 80 }) module!: string;
  @Column({ length: 80 }) action!: string;
  @Column({ name: 'record_key', type: 'varchar', length: 100, nullable: true }) recordKey!: string | null;
  @Column({ type: 'jsonb', nullable: true }) changes!: Record<string, unknown> | null;
  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true }) ipAddress!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
