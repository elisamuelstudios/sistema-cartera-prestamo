import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Installment } from './installment.entity';
import { Payment } from './payment.entity';

@Entity('payment_allocations')
export class PaymentAllocation {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'payment_id', type: 'uuid' }) paymentId!: string;
  @ManyToOne(() => Payment, (payment) => payment.allocations, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'payment_id' }) payment!: Payment;
  @Column({ name: 'installment_id', type: 'uuid' }) installmentId!: string;
  @ManyToOne(() => Installment, (installment) => installment.allocations, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'installment_id' }) installment!: Installment;
  @Column({ type: 'numeric', precision: 16, scale: 2 }) amount!: number;
}

