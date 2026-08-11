import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true, length: 60 }) username!: string;
  @Column({ name: 'password_hash' }) passwordHash!: string;
  @Column({ name: 'full_name', length: 150 }) fullName!: string;
  @Column({ type: 'varchar', length: 30, default: UserRole.OPERATOR }) role!: UserRole;
  @Column({ default: true }) active!: boolean;
  @Column({ name: 'must_change_password', default: true }) mustChangePassword!: boolean;
  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true }) lastLoginAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

