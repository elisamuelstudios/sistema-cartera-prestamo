import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../entities/client.entity';
import { Loan } from '../entities/loan.entity';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({ imports: [TypeOrmModule.forFeature([Client, Loan])], controllers: [ClientsController], providers: [ClientsService], exports: [ClientsService] })
export class ClientsModule {}

