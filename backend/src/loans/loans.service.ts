import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  ClientStatus,
  InstallmentStatus,
  LoanStatus,
  PaymentFrequency,
} from '../common/enums';
import { nextCode, toMoney } from '../common/utils/codes';
import { Client } from '../entities/client.entity';
import { Installment } from '../entities/installment.entity';
import { Loan } from '../entities/loan.entity';
import { Payment } from '../entities/payment.entity';
import {
  CreateLoanDto,
  LoanPreviewDto,
  RefinanceLoanDto,
  UpdateLoanDto,
} from './dto/loan.dto';

@Injectable()
export class LoansService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    @InjectRepository(Installment)
    private readonly installments: Repository<Installment>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    search = '',
    status = '',
    page = 1,
    pageSize = 25,
    clientId = '',
  ) {
    await this.refreshOverdueStatuses();
    const query = this.loans
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.client', 'client')
      .leftJoinAndSelect('loan.route', 'route')
      .loadRelationCountAndMap(
        'loan.paidInstallmentCount',
        'loan.installments',
        'paidInstallment',
        (paidInstallment) =>
          paidInstallment.where(
            'paidInstallment.paid_amount >= paidInstallment.amount',
          ),
      )
      .orderBy('loan.createdAt', 'DESC')
      .addOrderBy('loan.number', 'DESC');
    if (status) query.andWhere('loan.status = :status', { status });
    if (clientId) query.andWhere('loan.clientId = :clientId', { clientId });
    if (search.trim()) {
      const value = `%${search.trim()}%`;
      query.andWhere(
        new Brackets((where) =>
          where
            .where('loan.number ILIKE :value', { value })
            .orWhere('client.firstNames ILIKE :value', { value })
            .orWhere('client.lastNames ILIKE :value', { value })
            .orWhere('client.identification ILIKE :value', { value })
            .orWhere('route.name ILIKE :value', { value }),
        ),
      );
    }
    const total = await query.getCount();
    const items = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();
    return {
      items: items.map((loan) => this.present(loan)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const loan = await this.loans.findOne({
      where: [{ id }, { number: id }],
      relations: { client: true, route: true, installments: true },
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado');
    loan.installments?.sort((a, b) => a.number - b.number);
    return this.present(loan);
  }

  preview(dto: LoanPreviewDto) {
    return this.calculate(dto);
  }

  async create(dto: CreateLoanDto, username: string) {
    const saved = await this.dataSource.transaction(async (manager) => {
      const client = await manager.findOne(Client, {
        where: { id: dto.clientId },
      });
      if (!client) throw new NotFoundException('Cliente no encontrado');
      if (client.status !== ClientStatus.ACTIVE)
        throw new BadRequestException(
          'El cliente debe estar activo para crear un préstamo',
        );
      const codes = (await manager.find(Loan, { select: { number: true } }))
        .map((loan) => loan.number)
        .filter((number) => number.startsWith('PR-'));
      const loan = manager.create(
        Loan,
        this.buildLoan(dto, nextCode('PR', codes, 6), username),
      );
      const created = await manager.save(loan);
      await manager.save(
        this.buildSchedule(manager.getRepository(Installment), created),
      );
      return created;
    });
    await this.audit.log(username, 'Préstamos', 'Crear', saved.number);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateLoanDto, username: string) {
    const current = await this.loans.findOne({
      where: [{ id }, { number: id }],
    });
    if (!current) throw new NotFoundException('Préstamo no encontrado');
    const financialChange = [
      'disbursedAmount',
      'installmentCount',
      'interestRate',
      'dailyInstallment',
      'loanDate',
      'frequency',
    ].some((field) => dto[field as keyof UpdateLoanDto] !== undefined);
    if (
      financialChange &&
      (await this.payments.exists({ where: { loanId: current.id } }))
    ) {
      throw new BadRequestException(
        'No se pueden cambiar valores financieros porque el préstamo ya tiene pagos',
      );
    }
    await this.dataSource.transaction(async (manager) => {
      const merged = { ...current, ...dto } as CreateLoanDto;
      Object.assign(
        current,
        this.buildLoan(
          merged,
          current.number,
          current.createdBy ?? username,
          username,
        ),
        { id: current.id, status: current.status },
      );
      await manager.save(current);
      if (financialChange) {
        await manager.delete(Installment, { loanId: current.id });
        await manager.save(
          this.buildSchedule(manager.getRepository(Installment), current),
        );
      }
    });
    await this.audit.log(username, 'Préstamos', 'Editar', current.number);
    return this.findOne(current.id);
  }

  async refinance(id: string, dto: RefinanceLoanDto, username: string) {
    const origin = await this.loans.findOne({
      where: [{ id }, { number: id }],
      relations: { client: true },
    });
    if (!origin) throw new NotFoundException('Préstamo no encontrado');
    if (![LoanStatus.ACTIVE, LoanStatus.OVERDUE].includes(origin.status))
      throw new BadRequestException('Este préstamo no puede refinanciarse');
    const balance = await this.pendingBalance(origin.id);
    if (balance <= 0)
      throw new BadRequestException('El préstamo no tiene saldo pendiente');
    const saved = await this.dataSource.transaction(async (manager) => {
      const codes = (await manager.find(Loan, { select: { number: true } }))
        .map((loan) => loan.number)
        .filter((number) => number.startsWith('RF-'));
      const number = nextCode('RF', codes, 6);
      const refinanceDto = {
        ...dto,
        clientId: origin.clientId,
        requestedAmount: balance,
        disbursedAmount: balance,
      };
      const created = await manager.save(
        manager.create(Loan, {
          ...this.buildLoan(refinanceDto, number, username),
          operationType: 'Refinanciación',
          originLoanId: origin.id,
        }),
      );
      await manager.save(
        this.buildSchedule(manager.getRepository(Installment), created),
      );
      origin.status = LoanStatus.REFINANCED;
      origin.refinancedIn = number;
      origin.refinancedAt = dto.loanDate;
      await manager.save(origin);
      return created;
    });
    await this.audit.log(username, 'Préstamos', 'Refinanciar', saved.number, {
      origin: origin.number,
    });
    return this.findOne(saved.id);
  }

  async pendingBalance(loanId: string) {
    const result = await this.installments
      .createQueryBuilder('installment')
      .select(
        'COALESCE(SUM(installment.amount - installment.paid_amount), 0)',
        'balance',
      )
      .where('installment.loanId = :loanId', { loanId })
      .getRawOne<{ balance: string }>();
    return toMoney(result?.balance);
  }

  async refreshOverdueStatuses() {
    await this.dataSource.query(
      `UPDATE installments SET status = $1, days_late = CURRENT_DATE - due_date WHERE due_date < CURRENT_DATE AND paid_amount < amount AND status <> $2`,
      [InstallmentStatus.OVERDUE, InstallmentStatus.PAID],
    );
    await this.dataSource.query(
      `UPDATE loans l SET status = $1, overdue_amount = COALESCE((SELECT SUM(i.amount-i.paid_amount) FROM installments i WHERE i.loan_id=l.id AND i.due_date<CURRENT_DATE AND i.paid_amount<i.amount),0) WHERE l.status IN ($2,$3)`,
      [LoanStatus.OVERDUE, LoanStatus.ACTIVE, LoanStatus.OVERDUE],
    );
    await this.dataSource.query(
      `UPDATE loans l SET status = $1, overdue_amount = 0 WHERE l.status=$2 AND NOT EXISTS (SELECT 1 FROM installments i WHERE i.loan_id=l.id AND i.due_date<CURRENT_DATE AND i.paid_amount<i.amount)`,
      [LoanStatus.ACTIVE, LoanStatus.OVERDUE],
    );
  }

  private calculate(
    dto: Pick<
      LoanPreviewDto,
      | 'disbursedAmount'
      | 'installmentCount'
      | 'interestRate'
      | 'dailyInstallment'
      | 'administrativeFee'
      | 'insurance'
      | 'additionalCosts'
    >,
  ) {
    const principal = toMoney(dto.disbursedAmount);
    const installments = Math.max(1, Math.round(Number(dto.installmentCount)));
    const charges =
      toMoney(dto.administrativeFee) +
      toMoney(dto.insurance) +
      toMoney(dto.additionalCosts);
    const rate = Number(dto.interestRate);
    if (!Number.isFinite(rate) || rate < 0)
      throw new BadRequestException(
        'El interés calculado no puede ser negativo',
      );
    const interest = toMoney(principal * rate);
    const total = toMoney(principal + interest + charges);
    const dailyInstallment = dto.dailyInstallment
      ? toMoney(dto.dailyInstallment)
      : toMoney(Math.ceil(total / installments));
    const actualInstallmentCount = dto.dailyInstallment
      ? Math.max(1, Math.ceil(total / dailyInstallment))
      : installments;
    const lastInstallment = toMoney(
      total - dailyInstallment * (actualInstallmentCount - 1),
    );
    const normalizedRate = Math.round(rate * 1_000_000) / 1_000_000;
    return {
      interestRate: normalizedRate,
      generatedInterest: interest,
      total,
      dailyInstallment,
      installmentCount: actualInstallmentCount,
      lastInstallment: lastInstallment > 0 ? lastInstallment : dailyInstallment,
      warnings:
        normalizedRate < 0.1
          ? [
              'El interés calculado es inferior al 10 %. Confirma que corresponde al acuerdo con el cliente.',
            ]
          : [],
    };
  }

  private buildLoan(
    dto: CreateLoanDto,
    number: string,
    createdBy: string,
    advisorUsername = createdBy,
  ): Partial<Loan> {
    const values = this.calculate(dto);
    return {
      number,
      clientId: dto.clientId,
      requestedAmount: toMoney(dto.requestedAmount),
      disbursedAmount: toMoney(dto.disbursedAmount),
      loanDate: dto.loanDate,
      installmentCount: values.installmentCount,
      frequency: dto.frequency,
      interestRate: values.interestRate,
      interestType: dto.interestType ?? 'Fijo',
      administrativeFee: toMoney(dto.administrativeFee),
      insurance: toMoney(dto.insurance),
      additionalCosts: toMoney(dto.additionalCosts),
      dailyInstallment: values.dailyInstallment,
      generatedInterest: values.generatedInterest,
      outstandingPrincipal: values.total,
      overdueAmount: 0,
      totalPaid: 0,
      status: LoanStatus.ACTIVE,
      advisor: advisorUsername,
      observations: dto.observations?.trim() || null,
      routeId: dto.routeId || null,
      chargeMode: dto.chargeMode ?? 'Financiados',
      operationType: 'Nuevo',
      createdBy,
    };
  }

  private buildSchedule(repository: Repository<Installment>, loan: Loan) {
    const total = toMoney(
      Number(loan.disbursedAmount) +
        Number(loan.generatedInterest) +
        Number(loan.administrativeFee) +
        Number(loan.insurance) +
        Number(loan.additionalCosts),
    );
    const capitalUnit = toMoney(
      Number(loan.disbursedAmount) / loan.installmentCount,
    );
    const interestUnit = toMoney(
      Number(loan.generatedInterest) / loan.installmentCount,
    );
    let accumulated = 0;
    return Array.from({ length: loan.installmentCount }, (_value, index) => {
      const number = index + 1;
      const dueDate = this.addPeriod(loan.loanDate, loan.frequency, number);
      const amount =
        number === loan.installmentCount
          ? toMoney(total - accumulated)
          : toMoney(loan.dailyInstallment);
      accumulated = toMoney(accumulated + amount);
      return repository.create({
        loanId: loan.id,
        number,
        dueDate,
        capital:
          number === loan.installmentCount
            ? toMoney(Number(loan.disbursedAmount) - capitalUnit * index)
            : capitalUnit,
        interest:
          number === loan.installmentCount
            ? toMoney(Number(loan.generatedInterest) - interestUnit * index)
            : interestUnit,
        amount,
        remainingBalance: toMoney(total - accumulated),
        paidAmount: 0,
        status: InstallmentStatus.PENDING,
        daysLate: 0,
        paidAt: null,
      });
    });
  }

  private addPeriod(start: string, frequency: PaymentFrequency, index: number) {
    const date = new Date(`${start}T12:00:00Z`);
    if (frequency === PaymentFrequency.MONTHLY)
      date.setUTCMonth(date.getUTCMonth() + index);
    else
      date.setUTCDate(
        date.getUTCDate() +
          index *
            ({
              [PaymentFrequency.DAILY]: 1,
              [PaymentFrequency.WEEKLY]: 7,
              [PaymentFrequency.BIWEEKLY]: 15,
            }[frequency] ?? 1),
      );
    return date.toISOString().slice(0, 10);
  }

  private present(loan: Loan) {
    const totalDebt = toMoney(
      Number(loan.disbursedAmount) +
        Number(loan.generatedInterest) +
        Number(loan.administrativeFee) +
        Number(loan.insurance) +
        Number(loan.additionalCosts),
    );
    const mappedCount = (loan as Loan & { paidInstallmentCount?: number })
      .paidInstallmentCount;
    const installmentsPaid =
      mappedCount ??
      loan.installments?.filter(
        (installment) =>
          Number(installment.paidAmount) >= Number(installment.amount),
      ).length ??
      0;
    const lastInstallment =
      loan.installments?.find(
        (installment) => installment.number === loan.installmentCount,
      )?.amount ??
      toMoney(
        totalDebt - Number(loan.dailyInstallment) * (loan.installmentCount - 1),
      );
    return {
      ...loan,
      totalDebt,
      pendingBalance: Number(loan.outstandingPrincipal),
      installmentsPaid,
      installmentProgress: `${installmentsPaid} de ${loan.installmentCount}`,
      lastInstallment: Number(lastInstallment),
      clientName: loan.client
        ? `${loan.client.firstNames} ${loan.client.lastNames}`
            .replace(/\s+/g, ' ')
            .trim()
        : undefined,
    };
  }
}
