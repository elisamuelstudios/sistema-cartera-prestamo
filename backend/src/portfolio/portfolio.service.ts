import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Installment } from '../entities/installment.entity';
import { LoansService } from '../loans/loans.service';

@Injectable()
export class PortfolioService {
  constructor(@InjectRepository(Installment) private readonly installments: Repository<Installment>, private readonly loans: LoansService) {}
  async findAll(search = '', state = '', routeId = '', page = 1, pageSize = 25) {
    await this.loans.refreshOverdueStatuses();
    const query = this.installments.createQueryBuilder('installment').leftJoinAndSelect('installment.loan', 'loan')
      .leftJoinAndSelect('loan.client', 'client').leftJoinAndSelect('loan.route', 'route')
      .where('installment.paidAmount < installment.amount').orderBy('installment.dueDate', 'ASC');
    if (state) query.andWhere('installment.status = :state', { state });
    if (routeId) query.andWhere('loan.routeId = :routeId', { routeId });
    if (search.trim()) {
      const value = `%${search.trim()}%`;
      query.andWhere(new Brackets((where) => where.where('loan.number ILIKE :value', { value })
        .orWhere('client.firstNames ILIKE :value', { value }).orWhere('client.lastNames ILIKE :value', { value })
        .orWhere('client.identification ILIKE :value', { value }).orWhere('route.name ILIKE :value', { value })));
    }
    const total = await query.getCount();
    const rows = await query.skip((page - 1) * pageSize).take(pageSize).getMany();
    return { items: rows.map((row) => ({
      ...row, pendingAmount: Number(row.amount) - Number(row.paidAmount), loanNumber: row.loan.number,
      loanCreatedAt: row.loan.createdAt,
      clientName: `${row.loan.client.firstNames} ${row.loan.client.lastNames}`.replace(/\s+/g, ' ').trim(), routeName: row.loan.route?.name,
    })), total, page, pageSize };
  }
}
