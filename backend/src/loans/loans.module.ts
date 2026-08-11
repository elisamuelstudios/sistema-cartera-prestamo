import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../entities/client.entity';
import { Installment } from '../entities/installment.entity';
import { Loan } from '../entities/loan.entity';
import { Payment } from '../entities/payment.entity';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({ imports: [TypeOrmModule.forFeature([Loan, Installment, Client, Payment])], controllers: [LoansController], providers: [LoansService], exports: [LoansService] })
export class LoansModule {}

