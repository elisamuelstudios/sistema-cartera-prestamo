import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { InstallmentStatus, LoanStatus } from '../common/enums';
import { nextCode, toMoney } from '../common/utils/codes';
import { Installment } from '../entities/installment.entity';
import { Loan } from '../entities/loan.entity';
import { PaymentAllocation } from '../entities/payment-allocation.entity';
import { Payment } from '../entities/payment.entity';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    @InjectRepository(Installment)
    private readonly installments: Repository<Installment>,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    search = '',
    page = 1,
    pageSize = 25,
    method = '',
    routeId = '',
    loanId = '',
  ) {
    const query = this.payments
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.loan', 'loan')
      .leftJoinAndSelect('payment.client', 'client')
      .leftJoinAndSelect('payment.route', 'route')
      .orderBy('payment.paymentDate', 'DESC')
      .addOrderBy('payment.createdAt', 'DESC');
    if (method) query.andWhere('payment.method = :method', { method });
    if (routeId) query.andWhere('payment.routeId = :routeId', { routeId });
    if (loanId) query.andWhere('payment.loanId = :loanId', { loanId });
    if (search.trim()) {
      const value = `%${search.trim()}%`;
      query.andWhere(
        new Brackets((where) =>
          where
            .where('payment.receipt ILIKE :value', { value })
            .orWhere('loan.number ILIKE :value', { value })
            .orWhere('client.firstNames ILIKE :value', { value })
            .orWhere('client.lastNames ILIKE :value', { value })
            .orWhere('client.identification ILIKE :value', { value }),
        ),
      );
    }
    const total = await query.getCount();
    const items = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();
    const balances = await this.balancesAfterPayments(
      items.map((payment) => payment.id),
    );
    return {
      items: items.map((payment) =>
        this.present(payment, balances.get(payment.id) ?? 0),
      ),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const payment = await this.payments.findOne({
      where: [{ id }, { receipt: id }],
      relations: { loan: true, client: true, route: true },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    const balances = await this.balancesAfterPayments([payment.id]);
    return this.present(payment, balances.get(payment.id) ?? 0);
  }

  async create(dto: CreatePaymentDto, username: string) {
    const loan = await this.loans.findOne({ where: { id: dto.loanId } });
    if (!loan) throw new NotFoundException('Préstamo no encontrado');
    if (![LoanStatus.ACTIVE, LoanStatus.OVERDUE].includes(loan.status))
      throw new BadRequestException('El préstamo no admite pagos');
    const balance = await this.pendingBalance(loan.id);
    if (toMoney(dto.amount) > balance)
      throw new BadRequestException(
        `El pago supera el saldo pendiente de ${balance}`,
      );
    const codes = (await this.payments.find({ select: { receipt: true } })).map(
      (payment) => payment.receipt,
    );
    const payment = await this.payments.save(
      this.payments.create({
        receipt: nextCode('RC', codes, 6),
        loanId: loan.id,
        clientId: loan.clientId,
        paymentDate: dto.paymentDate,
        amount: toMoney(dto.amount),
        method: dto.method,
        responsible: dto.responsible?.trim() || username,
        observations: dto.observations?.trim() || null,
        routeId: loan.routeId,
        createdBy: username,
      }),
    );
    await this.recalculateLoan(loan.id);
    await this.audit.log(username, 'Pagos', 'Crear', payment.receipt, {
      amount: payment.amount,
      loan: loan.number,
    });
    return this.findOne(payment.id);
  }

  async update(id: string, dto: UpdatePaymentDto, username: string) {
    const payment = await this.payments.findOne({
      where: [{ id }, { receipt: id }],
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (dto.amount !== undefined) {
      const available = toMoney(
        (await this.pendingBalance(payment.loanId)) + Number(payment.amount),
      );
      if (toMoney(dto.amount) > available)
        throw new BadRequestException(
          `El pago supera el saldo disponible de ${available}`,
        );
      payment.amount = toMoney(dto.amount);
    }
    if (dto.paymentDate !== undefined) payment.paymentDate = dto.paymentDate;
    if (dto.method !== undefined) payment.method = dto.method;
    if (dto.responsible !== undefined)
      payment.responsible = dto.responsible.trim() || null;
    if (dto.observations !== undefined)
      payment.observations = dto.observations.trim() || null;
    await this.payments.save(payment);
    await this.recalculateLoan(payment.loanId);
    await this.audit.log(username, 'Pagos', 'Editar', payment.receipt, {
      amount: payment.amount,
    });
    return this.findOne(payment.id);
  }

  async recalculateLoan(loanId: string) {
    await this.dataSource.transaction(async (manager) => {
      const loan = await manager.findOne(Loan, { where: { id: loanId } });
      if (!loan) return;
      const installments = await manager.find(Installment, {
        where: { loanId },
        order: { number: 'ASC' },
      });
      const payments = await manager.find(Payment, {
        where: { loanId },
        order: { paymentDate: 'ASC', createdAt: 'ASC' },
      });
      await manager
        .createQueryBuilder()
        .delete()
        .from(PaymentAllocation)
        .where(
          'payment_id IN (SELECT id FROM payments WHERE loan_id = :loanId)',
          { loanId },
        )
        .execute();
      for (const installment of installments) {
        installment.paidAmount = 0;
        installment.paidAt = null;
        installment.status = InstallmentStatus.PENDING;
        installment.daysLate = 0;
      }
      const allocations: PaymentAllocation[] = [];
      for (const payment of payments) {
        let remaining = toMoney(payment.amount);
        for (const installment of installments) {
          if (remaining <= 0) break;
          const pending = toMoney(
            Number(installment.amount) - Number(installment.paidAmount),
          );
          if (pending <= 0) continue;
          const amount = Math.min(remaining, pending);
          installment.paidAmount = toMoney(
            Number(installment.paidAmount) + amount,
          );
          remaining = toMoney(remaining - amount);
          allocations.push(
            manager.create(PaymentAllocation, {
              paymentId: payment.id,
              installmentId: installment.id,
              amount,
            }),
          );
          if (Number(installment.paidAmount) >= Number(installment.amount))
            installment.paidAt = payment.paymentDate;
        }
      }
      const today = new Date().toISOString().slice(0, 10);
      let overdue = 0;
      for (const installment of installments) {
        const pending = toMoney(
          Number(installment.amount) - Number(installment.paidAmount),
        );
        if (pending <= 0) installment.status = InstallmentStatus.PAID;
        else if (installment.dueDate < today) {
          installment.status = InstallmentStatus.OVERDUE;
          installment.daysLate = Math.max(
            0,
            Math.floor(
              (Date.now() -
                new Date(`${installment.dueDate}T00:00:00Z`).getTime()) /
                86_400_000,
            ),
          );
          overdue += pending;
        } else if (Number(installment.paidAmount) > 0)
          installment.status = InstallmentStatus.PARTIAL;
      }
      const totalPaid = toMoney(
        payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      );
      const balance = toMoney(
        installments.reduce(
          (sum, installment) =>
            sum +
            Math.max(
              0,
              Number(installment.amount) - Number(installment.paidAmount),
            ),
          0,
        ),
      );
      loan.totalPaid = totalPaid;
      loan.outstandingPrincipal = balance;
      loan.overdueAmount = toMoney(overdue);
      if (balance <= 0) {
        loan.status = LoanStatus.PAID;
        loan.cancelledAt = today;
      } else if (
        ![LoanStatus.REFINANCED, LoanStatus.CANCELLED].includes(loan.status)
      ) {
        loan.status = overdue > 0 ? LoanStatus.OVERDUE : LoanStatus.ACTIVE;
        loan.cancelledAt = null;
      }
      await manager.save(installments);
      if (allocations.length) await manager.save(allocations);
      await manager.save(loan);
    });
  }

  private async pendingBalance(loanId: string) {
    const result = await this.installments
      .createQueryBuilder('installment')
      .select(
        'COALESCE(SUM(installment.amount - installment.paid_amount), 0)',
        'balance',
      )
      .where('installment.loanId=:loanId', { loanId })
      .getRawOne<{ balance: string }>();
    return toMoney(result?.balance);
  }

  private async balancesAfterPayments(paymentIds: string[]) {
    if (!paymentIds.length) return new Map<string, number>();
    const rows = await this.dataSource.query<
      Array<{ id: string; pending_balance: string }>
    >(
      `
      SELECT target.id,
        GREATEST(
          COALESCE((SELECT SUM(installment.amount) FROM installments installment WHERE installment.loan_id = target.loan_id), 0)
          - COALESCE((
            SELECT SUM(previous.amount) FROM payments previous
            WHERE previous.loan_id = target.loan_id AND (
              previous.payment_date < target.payment_date
              OR (previous.payment_date = target.payment_date AND previous.created_at < target.created_at)
              OR (previous.payment_date = target.payment_date AND previous.created_at = target.created_at AND previous.id::text <= target.id::text)
            )
          ), 0),
          0
        ) AS pending_balance
      FROM payments target
      WHERE target.id = ANY($1::uuid[])
    `,
      [paymentIds],
    );
    return new Map(rows.map((row) => [row.id, toMoney(row.pending_balance)]));
  }

  private present(payment: Payment, pendingBalance: number) {
    const totalDebt = payment.loan
      ? toMoney(
          Number(payment.loan.disbursedAmount) +
            Number(payment.loan.generatedInterest) +
            Number(payment.loan.administrativeFee) +
            Number(payment.loan.insurance) +
            Number(payment.loan.additionalCosts),
        )
      : 0;
    return {
      ...payment,
      totalDebt,
      pendingBalance,
      loanNumber: payment.loan?.number,
      clientName: payment.client
        ? `${payment.client.firstNames} ${payment.client.lastNames}`
            .replace(/\s+/g, ' ')
            .trim()
        : undefined,
    };
  }
}
