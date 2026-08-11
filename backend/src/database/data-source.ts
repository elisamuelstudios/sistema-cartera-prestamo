import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuditLog, CashClose, Client, Installment, Loan, Payment, PaymentAllocation, Route, Setting, User } from '../entities';
import { InitialSchema1754560000000 } from './migrations/1754560000000-initial-schema';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'cartera',
  password: process.env.DB_PASSWORD ?? 'cartera_local_2026',
  database: process.env.DB_NAME ?? 'cartera_eli',
  entities: [AuditLog, CashClose, Client, Installment, Loan, Payment, PaymentAllocation, Route, Setting, User],
  migrations: [InitialSchema1754560000000],
  synchronize: false,
});

