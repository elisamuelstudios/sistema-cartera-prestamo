import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { InstallmentStatus } from '../common/enums';
import { Loan } from './loan.entity';
import { PaymentAllocation } from './payment-allocation.entity';

@Entity('installments')
@Unique(['loanId', 'number'])
export class Installment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'loan_id', type: 'uuid' }) loanId!: string;
  @ManyToOne(() => Loan, (loan) => loan.installments, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'loan_id' }) loan!: Loan;
  @Column({ type: 'integer' }) number!: number;
  @Index() @Column({ name: 'due_date', type: 'date' }) dueDate!: string;
  @Column({ type: 'numeric', precision: 16, scale: 2 }) capital!: number;
  @Column({ type: 'numeric', precision: 16, scale: 2 }) interest!: number;
  @Column({ type: 'numeric', precision: 16, scale: 2 }) amount!: number;
  @Column({ name: 'remaining_balance', type: 'numeric', precision: 16, scale: 2 }) remainingBalance!: number;
  @Column({ name: 'paid_amount', type: 'numeric', precision: 16, scale: 2, default: 0 }) paidAmount!: number;
  @Column({ type: 'varchar', length: 24, default: InstallmentStatus.PENDING }) status!: InstallmentStatus;
  @Column({ name: 'days_late', type: 'integer', default: 0 }) daysLate!: number;
  @Column({ name: 'paid_at', type: 'date', nullable: true }) paidAt!: string | null;
  @OneToMany(() => PaymentAllocation, (allocation) => allocation.installment) allocations!: PaymentAllocation[];
}

