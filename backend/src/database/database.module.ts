import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Client, Installment, Loan, Payment, Route, Setting, User } from '../entities';
import { SeedService } from './seed.service';

@Module({ imports: [TypeOrmModule.forFeature([User, Route, Client, Loan, Installment, Payment, Setting, AuditLog])], providers: [SeedService] })
export class DatabaseModule {}

