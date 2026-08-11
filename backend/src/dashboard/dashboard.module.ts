import { Module } from '@nestjs/common';
import { LoansModule } from '../loans/loans.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({ imports: [LoansModule], controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}

