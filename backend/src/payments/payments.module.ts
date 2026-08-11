import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Installment } from '../entities/installment.entity';
import { Loan } from '../entities/loan.entity';
import { PaymentAllocation } from '../entities/payment-allocation.entity';
import { Payment } from '../entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({ imports: [TypeOrmModule.forFeature([Payment, Loan, Installment, PaymentAllocation])], controllers: [PaymentsController], providers: [PaymentsService], exports: [PaymentsService] })
export class PaymentsModule {}

