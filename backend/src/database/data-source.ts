import 'reflect-metadata';
import { DataSource } from 'typeorm';
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

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'cartera',
  password: process.env.DB_PASSWORD ?? 'cartera_local_2026',
  database: process.env.DB_NAME ?? 'cartera_eli',
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
  ],
  synchronize: false,
});
