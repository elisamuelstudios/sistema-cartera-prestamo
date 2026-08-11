import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Client } from './client.entity';
import { Loan } from './loan.entity';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true, length: 20 }) code!: string;
  @Column({ length: 160 }) name!: string;
  @Column({ type: 'varchar', length: 160, nullable: true }) collector!: string | null;
  @Column({ type: 'varchar', length: 160, nullable: true }) zone!: string | null;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ default: true }) active!: boolean;
  @Column({ name: 'created_by', type: 'varchar', length: 60, nullable: true }) createdBy!: string | null;
  @OneToMany(() => Client, (client) => client.route) clients!: Client[];
  @OneToMany(() => Loan, (loan) => loan.route) loans!: Loan[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
