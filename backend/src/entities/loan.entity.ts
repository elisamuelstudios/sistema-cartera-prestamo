import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { LoanStatus, PaymentFrequency } from '../common/enums';
import { Client } from './client.entity';
import { Installment } from './installment.entity';
import { Payment } from './payment.entity';
import { Route } from './route.entity';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ unique: true, length: 24 }) number!: string;
  @Column({ name: 'client_id', type: 'uuid' }) clientId!: string;
  @ManyToOne(() => Client, (client) => client.loans, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'client_id' }) client!: Client;
  @Column({ name: 'requested_amount', type: 'numeric', precision: 16, scale: 2 }) requestedAmount!: number;
  @Column({ name: 'disbursed_amount', type: 'numeric', precision: 16, scale: 2 }) disbursedAmount!: number;
  @Column({ name: 'loan_date', type: 'date' }) loanDate!: string;
  @Column({ name: 'installment_count', type: 'integer' }) installmentCount!: number;
  @Column({ type: 'varchar', length: 20, default: PaymentFrequency.DAILY }) frequency!: PaymentFrequency;
  @Column({ name: 'interest_rate', type: 'numeric', precision: 10, scale: 6 }) interestRate!: number;
  @Column({ name: 'interest_type', length: 30, default: 'Fijo' }) interestType!: string;
  @Column({ name: 'administrative_fee', type: 'numeric', precision: 16, scale: 2, default: 0 }) administrativeFee!: number;
  @Column({ type: 'numeric', precision: 16, scale: 2, default: 0 }) insurance!: number;
  @Column({ name: 'additional_costs', type: 'numeric', precision: 16, scale: 2, default: 0 }) additionalCosts!: number;
  @Column({ name: 'daily_installment', type: 'numeric', precision: 16, scale: 2 }) dailyInstallment!: number;
  @Column({ name: 'generated_interest', type: 'numeric', precision: 16, scale: 2 }) generatedInterest!: number;
  @Column({ name: 'outstanding_principal', type: 'numeric', precision: 16, scale: 2 }) outstandingPrincipal!: number;
  @Column({ name: 'overdue_amount', type: 'numeric', precision: 16, scale: 2, default: 0 }) overdueAmount!: number;
  @Column({ name: 'total_paid', type: 'numeric', precision: 16, scale: 2, default: 0 }) totalPaid!: number;
  @Column({ type: 'varchar', length: 30, default: LoanStatus.ACTIVE }) status!: LoanStatus;
  @Column({ name: 'cancelled_at', type: 'date', nullable: true }) cancelledAt!: string | null;
  @Column({ name: 'advisor', type: 'varchar', length: 160, nullable: true }) advisor!: string | null;
  @Column({ type: 'text', nullable: true }) observations!: string | null;
  @Column({ name: 'route_id', type: 'uuid', nullable: true }) routeId!: string | null;
  @ManyToOne(() => Route, (route) => route.loans, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'route_id' }) route!: Route | null;
  @Column({ name: 'charge_mode', length: 40, default: 'Financiados' }) chargeMode!: string;
  @Column({ name: 'operation_type', length: 30, default: 'Nuevo' }) operationType!: string;
  @Column({ name: 'origin_loan_id', type: 'uuid', nullable: true }) originLoanId!: string | null;
  @Column({ name: 'refinanced_in', type: 'varchar', length: 24, nullable: true }) refinancedIn!: string | null;
  @Column({ name: 'refinanced_at', type: 'date', nullable: true }) refinancedAt!: string | null;
  @Column({ name: 'created_by', type: 'varchar', length: 60, nullable: true }) createdBy!: string | null;
  @OneToMany(() => Installment, (installment) => installment.loan) installments!: Installment[];
  @OneToMany(() => Payment, (payment) => payment.loan) payments!: Payment[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
