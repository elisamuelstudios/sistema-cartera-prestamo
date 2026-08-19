import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Route } from './route.entity';

@Entity('cash_closures')
export class CashClose {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true })
  @Column({ unique: true, length: 24 })
  number!: string;
  @Index() @Column({ type: 'date' }) date!: string;
  @Column({ name: 'route_id', type: 'uuid' }) routeId!: string;
  @ManyToOne(() => Route, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'route_id' })
  route!: Route;
  @Column({ type: 'varchar', length: 160, nullable: true }) collector!:
    string | null;
  @Column({
    name: 'expected_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  expectedAmount!: number;
  @Column({
    name: 'received_amount',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  receivedAmount!: number;
  @Column({
    name: 'total_expenses',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  totalExpenses!: number;
  @Column({
    name: 'initial_cash',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  initialCash!: number;
  @Column({
    name: 'cash_brought_by_collector',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  cashBroughtByCollector!: number;
  @Column({
    name: 'collector_carry_cash',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  collectorCarryCash!: number;
  @Column({
    name: 'total_sales',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  totalSales!: number;
  @Column({ type: 'numeric', precision: 16, scale: 2, default: 0 })
  mochi!: number;
  @Column({
    name: 'internal_debt_charge',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  internalDebtCharge!: number;
  @Column({
    name: 'cash_abono',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  cashAbono!: number;
  @Column({
    name: 'final_cash',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  finalCash!: number;
  @Column({
    name: 'cash_count',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  cashCount!: number;
  @Column({ type: 'numeric', precision: 16, scale: 2, default: 0 })
  difference!: number;
  @Column({ type: 'numeric', precision: 8, scale: 4, default: 0 })
  effectiveness!: number;
  @Column({ name: 'invoices_in', type: 'integer', default: 0 })
  invoicesIn!: number;
  @Column({ name: 'invoices_out', type: 'integer', default: 0 })
  invoicesOut!: number;
  @Column({ name: 'paid_invoices', type: 'integer', default: 0 })
  paidInvoices!: number;
  @Column({ name: 'waiting_invoices', type: 'integer', default: 0 })
  waitingInvoices!: number;
  @Column({ name: 'refinanced_loans', type: 'integer', default: 0 })
  refinancedLoans!: number;
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" }) details!: Record<
    string,
    unknown
  >;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'varchar', length: 60, nullable: true })
  createdBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
