import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  ClientStatus,
  InstallmentStatus,
  LoanStatus,
  PaymentFrequency,
} from '../common/enums';
import {
  buildSchedule,
  ChargeMode,
  InterestType,
  isChargeMode,
  isInterestType,
  resolvePrincipal,
  ScheduleResult,
} from '../common/finance/interest';
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

/** Umbral bajo el cual se avisa al asesor (no bloquea la operación). */
const LOW_RATE_WARNING_THRESHOLD = 0.1;

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
    code = '',
    clientName = '',
    identification = '',
    status = '',
    page = 1,
    pageSize = 25,
    clientId = '',
    routeId = '',
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
      .loadRelationCountAndMap(
        'loan.partialInstallmentCount',
        'loan.installments',
        'partialInstallment',
        (partialInstallment) =>
          partialInstallment.where(
            'partialInstallment.paid_amount > 0 AND partialInstallment.paid_amount < partialInstallment.amount',
          ),
      )
      .orderBy('loan.createdAt', 'DESC')
      .addOrderBy('loan.number', 'DESC');
    if (status) query.andWhere('loan.status = :status', { status });
    if (clientId) query.andWhere('loan.clientId = :clientId', { clientId });
    if (routeId) query.andWhere('loan.routeId = :routeId', { routeId });
    if (code.trim())
      query.andWhere('loan.number ILIKE :code', { code: `%${code.trim()}%` });
    if (clientName.trim())
      query.andWhere(
        "(client.firstNames ILIKE :clientName OR client.lastNames ILIKE :clientName OR CONCAT(client.firstNames, ' ', client.lastNames) ILIKE :clientName)",
        { clientName: `%${clientName.trim()}%` },
      );
    if (identification.trim())
      query.andWhere('client.identification ILIKE :identification', {
        identification: `%${identification.trim()}%`,
      });
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

  async codes() {
    const rows = await this.loans
      .createQueryBuilder('loan')
      .leftJoin('loan.client', 'client')
      .select('loan.number', 'number')
      .addSelect('client.firstNames', 'firstNames')
      .addSelect('client.lastNames', 'lastNames')
      .orderBy('loan.number', 'DESC')
      .limit(1000)
      .getRawMany<{ number: string; firstNames: string; lastNames: string }>();
    return rows.map((row) => ({
      value: row.number,
      label: `${row.number} · ${row.firstNames ?? ''} ${row.lastNames ?? ''}`.trim(),
    }));
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

  async remove(id: string, username: string) {
    const loan = await this.loans.findOne({ where: [{ id }, { number: id }] });
    if (!loan) throw new NotFoundException('Préstamo no encontrado');
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Payment, { loanId: loan.id });
      await manager.delete(Loan, { id: loan.id });
    });
    await this.audit.log(username, 'Préstamos', 'Eliminar', loan.number);
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
      const { values, schedule } = this.buildLoan(
        dto,
        nextCode('PR', codes, 6),
        username,
      );
      const created = await manager.save(manager.create(Loan, values));
      await manager.save(
        this.materializeSchedule(
          manager.getRepository(Installment),
          created.id,
          schedule,
        ),
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
      'requestedAmount',
      'disbursedAmount',
      'installmentCount',
      'interestRate',
      'interestType',
      'chargeMode',
      'administrativeFee',
      'insurance',
      'additionalCosts',
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
      const { values, schedule } = this.buildLoan(
        merged,
        current.number,
        current.createdBy ?? username,
        username,
      );
      Object.assign(current, values, {
        id: current.id,
        status: current.status,
      });
      await manager.save(current);
      if (financialChange) {
        await manager.delete(Installment, { loanId: current.id });
        await manager.save(
          this.materializeSchedule(
            manager.getRepository(Installment),
            current.id,
            schedule,
          ),
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
      const { values, schedule } = this.buildLoan(
        refinanceDto,
        number,
        username,
      );
      const created = await manager.save(
        manager.create(Loan, {
          ...values,
          operationType: 'Refinanciación',
          originLoanId: origin.id,
        }),
      );
      await manager.save(
        this.materializeSchedule(
          manager.getRepository(Installment),
          created.id,
          schedule,
        ),
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

  // ---------------------------------------------------------------------------
  // Cálculo financiero
  //
  // Toda la aritmética vive en `common/finance/interest.ts`: funciones puras,
  // sin dependencias de Nest ni de TypeORM, cubiertas por tests de paridad
  // contra los planes de pago reales del Excel. Este servicio solo orquesta.
  // ---------------------------------------------------------------------------

  /**
   * `interestRate` es la tasa **MENSUAL** en decimal (0,28 = 28 % mensual).
   *
   *  - Tipo `Fijo`        -> interés = capital × tasa mensual, aplicado una vez.
   *  - Tipo `Sobre saldo` -> por cuota: saldo × (tasa mensual / períodos del mes).
   *
   * El capital sobre el que se calcula depende del modo de cargos: con
   * `Financiados` (defecto), comisión + seguro + gastos entran al capital y por
   * tanto SÍ generan interés, igual que en el Excel.
   */
  private calculate(dto: LoanPreviewDto) {
    const rate = Number(dto.interestRate);
    if (!Number.isFinite(rate) || rate < 0)
      throw new BadRequestException(
        'El interés calculado no puede ser negativo',
      );

    const frequency = dto.frequency ?? PaymentFrequency.DAILY;
    const interestType: InterestType = isInterestType(dto.interestType)
      ? dto.interestType
      : 'Fijo';
    const chargeMode: ChargeMode = isChargeMode(dto.chargeMode)
      ? dto.chargeMode
      : 'Financiados';

    const base = resolvePrincipal({
      requestedAmount: dto.requestedAmount ?? dto.disbursedAmount,
      disbursedAmount: dto.disbursedAmount,
      administrativeFee: dto.administrativeFee,
      insurance: dto.insurance,
      additionalCosts: dto.additionalCosts,
      chargeMode,
    });

    let schedule: ScheduleResult;
    try {
      schedule = buildSchedule({
        principal: base.principal,
        installmentCount: dto.installmentCount,
        loanDate: dto.loanDate ?? new Date().toISOString().slice(0, 10),
        frequency,
        monthlyRate: rate,
        interestType,
        agreedInstallment: dto.dailyInstallment,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Parámetros de crédito inválidos',
      );
    }

    // Si se pactó una cuota, buildSchedule() resolvió una tasa distinta a la
    // tipeada (el número de cuotas nunca cambia; lo que se ajusta es la
    // tasa/el interés). Esa es la tasa real del préstamo, no la de entrada.
    const normalizedRate = Math.round(schedule.monthlyRate * 1_000_000) / 1_000_000;
    return {
      interestRate: normalizedRate,
      interestType,
      chargeMode,
      frequency,
      principal: base.principal,
      disbursedAmount: base.disbursedAmount,
      charges: base.charges,
      generatedInterest: schedule.totalInterest,
      total: schedule.total,
      dailyInstallment: schedule.installmentAmount,
      installmentCount: schedule.installmentCount,
      lastInstallment: schedule.lastInstallment,
      schedule: schedule.rows,
      warnings:
        normalizedRate < LOW_RATE_WARNING_THRESHOLD
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
  ): { values: Partial<Loan>; schedule: ScheduleResult['rows'] } {
    const values = this.calculate(dto);
    return {
      schedule: values.schedule,
      values: {
        number,
        clientId: dto.clientId,
        requestedAmount: toMoney(dto.requestedAmount),
        // El desembolso efectivo depende del modo de cargos (p. ej. Descontados).
        disbursedAmount: values.disbursedAmount,
        loanDate: dto.loanDate,
        installmentCount: values.installmentCount,
        frequency: values.frequency,
        interestRate: values.interestRate,
        interestType: values.interestType,
        administrativeFee: toMoney(dto.administrativeFee),
        insurance: toMoney(dto.insurance),
        additionalCosts: toMoney(dto.additionalCosts),
        dailyInstallment: values.dailyInstallment,
        generatedInterest: values.generatedInterest,
        // TODO (Fase 2): separar en `outstanding_principal` (capital pendiente,
        // Excel: CapitalPendiente) y `total_outstanding` (Excel:
        // SaldoPendienteTotal). Hoy esta columna guarda el saldo TOTAL pendiente,
        // que es lo que consumen el dashboard y el módulo de pagos.
        outstandingPrincipal: values.total,
        overdueAmount: 0,
        totalPaid: 0,
        status: LoanStatus.ACTIVE,
        advisor: advisorUsername,
        observations: dto.observations?.trim() || null,
        routeId: dto.routeId || null,
        chargeMode: values.chargeMode,
        operationType: 'Nuevo',
        createdBy,
      },
    };
  }

  private materializeSchedule(
    repository: Repository<Installment>,
    loanId: string,
    rows: ScheduleResult['rows'],
  ) {
    return rows.map((row) =>
      repository.create({
        loanId,
        number: row.number,
        dueDate: row.dueDate,
        capital: row.capital,
        interest: row.interest,
        amount: row.amount,
        remainingBalance: row.remainingBalance,
        paidAmount: 0,
        status: InstallmentStatus.PENDING,
        daysLate: 0,
        paidAt: null,
      }),
    );
  }

  private present(loan: Loan) {
    const base = resolvePrincipal({
      requestedAmount: Number(loan.requestedAmount),
      disbursedAmount: Number(loan.disbursedAmount),
      administrativeFee: Number(loan.administrativeFee),
      insurance: Number(loan.insurance),
      additionalCosts: Number(loan.additionalCosts),
      chargeMode: isChargeMode(loan.chargeMode)
        ? loan.chargeMode
        : 'Financiados',
    });
    // Con `Descontados` el capital ya es lo solicitado; con `Financiados` incluye
    // los cargos. En ambos casos la deuda total es capital + interés.
    const totalDebt = toMoney(base.principal + Number(loan.generatedInterest));

    const extended = loan as Loan & {
      paidInstallmentCount?: number;
      partialInstallmentCount?: number;
    };
    const installmentsPaid =
      extended.paidInstallmentCount ??
      loan.installments?.filter(
        (installment) =>
          Number(installment.paidAmount) >= Number(installment.amount),
      ).length ??
      0;
    const hasPartial =
      extended.partialInstallmentCount !== undefined
        ? extended.partialInstallmentCount > 0
        : (loan.installments?.some(
            (installment) =>
              Number(installment.paidAmount) > 0 &&
              Number(installment.paidAmount) < Number(installment.amount),
          ) ?? false);

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
      // Excel: `ProgresoCuotas` -> "5 de 32 + parcial".
      installmentProgress: `${installmentsPaid} de ${loan.installmentCount}${
        hasPartial ? ' + parcial' : ''
      }`,
      lastInstallment: Number(lastInstallment),
      clientName: loan.client
        ? `${loan.client.firstNames} ${loan.client.lastNames}`
            .replace(/\s+/g, ' ')
            .trim()
        : undefined,
    };
  }
}
