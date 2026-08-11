import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PaymentMethod } from '../common/enums';
import { Client } from './client.entity';
import { Loan } from './loan.entity';
import { PaymentAllocation } from './payment-allocation.entity';
import { Route } from './route.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ unique: true, length: 24 }) receipt!: string;
  @Column({ name: 'loan_id', type: 'uuid' }) loanId!: string;
  @ManyToOne(() => Loan, (loan) => loan.payments, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'loan_id' }) loan!: Loan;
  @Column({ name: 'client_id', type: 'uuid' }) clientId!: string;
  @ManyToOne(() => Client, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'client_id' }) client!: Client;
  @Column({ name: 'payment_date', type: 'date' }) paymentDate!: string;
  @Column({ type: 'numeric', precision: 16, scale: 2 }) amount!: number;
  @Column({ type: 'varchar', length: 30, default: PaymentMethod.CASH }) method!: PaymentMethod;
  @Column({ type: 'varchar', length: 160, nullable: true }) responsible!: string | null;
  @Column({ type: 'text', nullable: true }) observations!: string | null;
  @Column({ name: 'route_id', type: 'uuid', nullable: true }) routeId!: string | null;
  @ManyToOne(() => Route, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'route_id' }) route!: Route | null;
  @Column({ name: 'created_by', type: 'varchar', length: 60, nullable: true }) createdBy!: string | null;
  @OneToMany(() => PaymentAllocation, (allocation) => allocation.payment) allocations!: PaymentAllocation[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
