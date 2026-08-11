import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Installment } from '../entities/installment.entity';
import { LoansModule } from '../loans/loans.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

@Module({ imports: [TypeOrmModule.forFeature([Installment]), LoansModule], controllers: [PortfolioController], providers: [PortfolioService] })
export class PortfolioModule {}

