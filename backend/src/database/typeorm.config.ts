import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  AuditLog,
  CashClose,
  Client,
  Installment,
  Loan,
  Payment,
  PaymentAllocation,
  Route,
  Setting,
  User,
} from '../entities';
import { InitialSchema1754560000000 } from './migrations/1754560000000-initial-schema';
import { PaymentBalanceIndexes1786466000000 } from './migrations/1786466000000-payment-balance-indexes';
import { ExcelLogicAlignment1786813200000 } from './migrations/1786813200000-excel-logic-alignment';
import { CashClosuresInternalDebt1787200000000 } from './migrations/1787200000000-cash-closures-internal-debt';

export function typeOrmConfig(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get('DB_USER', 'cartera'),
    password: config.get('DB_PASSWORD', 'cartera_local_2026'),
    database: config.get('DB_NAME', 'cartera_eli'),
    entities: [
      AuditLog,
      CashClose,
      Client,
      Installment,
      Loan,
      Payment,
      PaymentAllocation,
      Route,
      Setting,
      User,
    ],
    migrations: [
      InitialSchema1754560000000,
      PaymentBalanceIndexes1786466000000,
      ExcelLogicAlignment1786813200000,
      CashClosuresInternalDebt1787200000000,
    ],
    migrationsRun: true,
    synchronize: false,
    logging: config.get('NODE_ENV') === 'development',
  };
}
