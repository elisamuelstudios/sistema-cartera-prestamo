import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashClose } from '../entities/cash-close.entity';
import { Route } from '../entities/route.entity';
import { CashClosuresController } from './cash-closures.controller';
import { CashClosuresService } from './cash-closures.service';

@Module({ imports: [TypeOrmModule.forFeature([CashClose, Route])], controllers: [CashClosuresController], providers: [CashClosuresService] })
export class CashClosuresModule {}

