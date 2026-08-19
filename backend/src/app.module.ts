import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { BackupsModule } from './backups/backups.module';
import { CashClosuresModule } from './cash-closures/cash-closures.module';
import { ClientsModule } from './clients/clients.module';
import { RolesGuard } from './common/guards/roles.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { typeOrmConfig } from './database/typeorm.config';
import { HealthController } from './health/health.controller';
import { LoansModule } from './loans/loans.module';
import { PaymentsModule } from './payments/payments.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ReportsModule } from './reports/reports.module';
import { RoutesModule } from './routes/routes.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: typeOrmConfig }),
    AuditModule, AuthModule, BackupsModule, CashClosuresModule, ClientsModule, DashboardModule, DatabaseModule,
    LoansModule, PaymentsModule, PortfolioModule, ReportsModule, RoutesModule, SettingsModule, UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
