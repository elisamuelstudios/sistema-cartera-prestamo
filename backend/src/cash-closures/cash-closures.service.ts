import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { nextCode, toMoney } from '../common/utils/codes';
import { CashClose } from '../entities/cash-close.entity';
import { Route } from '../entities/route.entity';
import { CreateCashCloseDto } from './dto/cash-close.dto';

@Injectable()
export class CashClosuresService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CashClose)
    private readonly closures: Repository<CashClose>,
    @InjectRepository(Route) private readonly routes: Repository<Route>,
    private readonly audit: AuditService,
  ) {}

  findAll(routeId = '') {
    return this.closures.find({
      where: routeId ? { routeId } : {},
      relations: { route: true },
      order: { date: 'DESC', createdAt: 'DESC' },
      take: 200,
    });
  }

  async summary(routeId: string, date: string) {
    const route = await this.routes.findOne({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Ruta no encontrada');
    const [row] = await this.dataSource.query<Array<Record<string, string>>>(
      `
      WITH route_loans AS (
        SELECT * FROM loans WHERE route_id=$1
      ), daily_loans AS (
        SELECT * FROM route_loans WHERE loan_date=$2::date
      ), active_route_loans AS (
        SELECT * FROM route_loans WHERE status NOT IN ('Refinanciado','Anulado')
      ), paid_today AS (
        SELECT p.* FROM payments p WHERE p.route_id=$1 AND p.payment_date=$2::date
      ), expected_from_balance AS (
        SELECT DISTINCT i.loan_id
        FROM installments i JOIN active_route_loans l ON l.id=i.loan_id
        WHERE i.due_date<=$2::date AND i.paid_amount<i.amount
      ), expected_loans AS (
        SELECT loan_id FROM expected_from_balance
        UNION
        SELECT loan_id FROM paid_today
      ), closed_today AS (
        SELECT id FROM route_loans
        WHERE (status='Cancelado' AND cancelled_at=$2::date)
           OR (status='Refinanciado' AND refinanced_at=$2::date)
      ), daily_refinances AS (
        SELECT * FROM daily_loans
        WHERE operation_type ILIKE '%Refinanci%' OR number LIKE 'RF-%'
      )
      SELECT
        (SELECT COUNT(*) FROM daily_loans) AS invoices_in,
        (SELECT COUNT(*) FROM closed_today) AS invoices_out,
        (SELECT COUNT(*) FROM expected_loans) AS expected_invoices,
        (SELECT COUNT(DISTINCT loan_id) FROM paid_today) AS paid_invoices,
        (SELECT COUNT(*) FROM expected_loans e WHERE NOT EXISTS (SELECT 1 FROM paid_today p WHERE p.loan_id=e.loan_id)) AS waiting_invoices,
        (SELECT COALESCE(SUM(amount),0) FROM paid_today p WHERE NOT EXISTS (SELECT 1 FROM closed_today c WHERE c.id=p.loan_id)) AS sales_payments,
        (SELECT COALESCE(SUM(amount),0) FROM paid_today p WHERE EXISTS (SELECT 1 FROM closed_today c WHERE c.id=p.loan_id)) AS cancelled_payments,
        (SELECT COUNT(*) FROM daily_refinances) AS refinanced_count,
        (SELECT COALESCE(SUM(disbursed_amount),0) FROM daily_refinances) AS refinanced_amount,
        (SELECT COALESCE(SUM(CASE WHEN origin_balance.balance > 0 THEN origin_balance.balance ELSE refinance.disbursed_amount END),0)
          FROM daily_refinances refinance
          LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(GREATEST(installment.amount-installment.paid_amount,0)),0) AS balance
            FROM installments installment WHERE installment.loan_id=refinance.origin_loan_id
          ) origin_balance ON true) AS mochi,
        (SELECT COALESCE(SUM(disbursed_amount),0) FROM daily_loans) AS total_sales,
        (SELECT COALESCE(SUM(GREATEST(i.amount-i.paid_amount,0)),0) FROM installments i JOIN active_route_loans l ON l.id=i.loan_id WHERE i.due_date<=$2::date) AS outstanding_due,
        (SELECT COALESCE(SUM(amount),0) FROM paid_today) AS received_amount,
        (SELECT COALESCE(final_cash,0) FROM cash_closures WHERE route_id=$1 AND date<$2::date ORDER BY date DESC, created_at DESC LIMIT 1) AS initial_cash,
        (SELECT COALESCE(collector_carry_cash,0) FROM cash_closures WHERE route_id=$1 AND date<$2::date ORDER BY date DESC, created_at DESC LIMIT 1) AS cash_brought_by_collector
    `,
      [routeId, date],
    );

    const received = Number(row?.received_amount ?? 0);
    const expected = Number(row?.outstanding_due ?? 0) + received;
    const invoicesIn = Number(row?.invoices_in ?? 0);
    const expectedInvoices = Number(row?.expected_invoices ?? 0);
    const paidInvoices = Number(row?.paid_invoices ?? 0);
    const gota = Math.max(0, expected - received);
    return {
      routeId,
      routeCode: route.code,
      routeName: route.name,
      collector: route.collector,
      date,
      invoicesIn,
      invoicesOut: Number(row?.invoices_out ?? 0),
      paidInvoices,
      waitingInvoices: Number(row?.waiting_invoices ?? 0),
      salesPayments: Number(row?.sales_payments ?? 0),
      cancelledPayments: Number(row?.cancelled_payments ?? 0),
      refinancedAmount: Number(row?.refinanced_amount ?? 0),
      refinancedLoans: Number(row?.refinanced_count ?? 0),
      expectedAmount: expected,
      receivedAmount: received,
      effectiveness: expected > 0 ? received / expected : 0,
      gota,
      gotaPercentage: expected > 0 ? gota / expected : 0,
      ratingPercentage:
        expectedInvoices > 0 ? Math.min(1, paidInvoices / expectedInvoices) : 0,
      initialCash: Number(row?.initial_cash ?? 0),
      cashBroughtByCollector: Number(row?.cash_brought_by_collector ?? 0),
      totalSales: Number(row?.total_sales ?? 0),
      mochi: Number(row?.mochi ?? 0),
    };
  }

  async create(dto: CreateCashCloseDto, username: string) {
    const summary = await this.summary(dto.routeId, dto.date);
    const codes = (await this.closures.find({ select: { number: true } })).map(
      (close) => close.number,
    );

    const expenseParts = [
      dto.lunchExpense,
      dto.snackExpense,
      dto.stationeryExpense,
      dto.payrollExpense,
      dto.fuelExpense,
      dto.repairExpense,
      dto.extraExpenses,
    ].map(toMoney);
    const detailedExpenses = toMoney(
      expenseParts.reduce((sum, value) => sum + value, 0),
    );
    const expenses =
      detailedExpenses > 0 ? detailedExpenses : toMoney(dto.totalExpenses);
    const initial = toMoney(summary.initialCash);
    const received = toMoney(summary.receivedAmount);
    const insurance = toMoney(dto.insuranceIncome);
    const otherIncome = toMoney(dto.otherIncome);
    const sales = toMoney(summary.totalSales);
    const cashBroughtByCollector = toMoney(summary.cashBroughtByCollector);
    const mochi = toMoney(summary.mochi);
    const capitalWithdrawal = toMoney(dto.capitalWithdrawal);
    const cashToInternal = toMoney(dto.cashToInternal);
    // AbonoEfectivo: efectivo adicional que entra a caja (como otherIncome).
    // CargaDeudaInterna: efectivo que sale de caja para cubrir un deudor
    // interno (como capitalWithdrawal/cashToInternal).
    const cashAbono = toMoney(dto.cashAbono);
    const internalDebtCharge = toMoney(dto.internalDebtCharge);
    const finalCash = toMoney(
      initial +
        received +
        insurance +
        otherIncome +
        sales +
        cashAbono -
        expenses -
        capitalWithdrawal -
        cashToInternal -
        internalDebtCharge,
    );

    const billsSubtotal = toMoney(
      Number(dto.bills100000 ?? 0) * 100000 +
        Number(dto.bills50000 ?? 0) * 50000 +
        Number(dto.bills20000 ?? 0) * 20000 +
        Number(dto.bills10000 ?? 0) * 10000 +
        Number(dto.bills5000 ?? 0) * 5000 +
        Number(dto.bills2000 ?? 0) * 2000,
    );
    const coinsSubtotal = toMoney(
      Number(dto.coins1000 ?? 0) * 1000 +
        Number(dto.coins500 ?? 0) * 500 +
        Number(dto.coins200 ?? 0) * 200 +
        Number(dto.coins100 ?? 0) * 100 +
        Number(dto.coins50 ?? 0) * 50,
    );
    const countedByDenomination = toMoney(billsSubtotal + coinsSubtotal);
    const cashCount =
      countedByDenomination > 0
        ? countedByDenomination
        : toMoney(dto.cashCount);

    const details = {
      ...(dto.details ?? {}),
      concept: 'Cierre de caja',
      movement: 'Cierre ruta',
      cashBroughtByCollector,
      baseOne: toMoney(dto.baseOne),
      baseTwo: toMoney(dto.baseTwo),
      insuranceIncome: insurance,
      otherIncome,
      totalSales: sales,
      lunchExpense: expenseParts[0],
      snackExpense: expenseParts[1],
      stationeryExpense: expenseParts[2],
      payrollExpense: expenseParts[3],
      fuelExpense: expenseParts[4],
      repairExpense: expenseParts[5],
      extraExpenses: expenseParts[6],
      expenseComments: dto.expenseComments?.trim() || null,
      capitalWithdrawal,
      cashToInternal,
      collectorCarryCash: toMoney(dto.collectorCarryCash),
      internalDebtorName: dto.internalDebtorName?.trim() || null,
      internalDebtCharge,
      cashAbono,
      salesPayments: summary.salesPayments,
      cancelledPayments: summary.cancelledPayments,
      refinancedAmount: summary.refinancedAmount,
      mochi,
      gota: summary.gota,
      gotaPercentage: summary.gotaPercentage,
      ratingPercentage: summary.ratingPercentage,
      totalIncome: toMoney(received + insurance + otherIncome + sales),
      denominations: {
        bills100000: Number(dto.bills100000 ?? 0),
        bills50000: Number(dto.bills50000 ?? 0),
        bills20000: Number(dto.bills20000 ?? 0),
        bills10000: Number(dto.bills10000 ?? 0),
        bills5000: Number(dto.bills5000 ?? 0),
        bills2000: Number(dto.bills2000 ?? 0),
        coins1000: Number(dto.coins1000 ?? 0),
        coins500: Number(dto.coins500 ?? 0),
        coins200: Number(dto.coins200 ?? 0),
        coins100: Number(dto.coins100 ?? 0),
        coins50: Number(dto.coins50 ?? 0),
        billsSubtotal,
        coinsSubtotal,
      },
    };

    const close = await this.closures.save(
      this.closures.create({
        number: nextCode('CC', codes, 6),
        date: dto.date,
        routeId: dto.routeId,
        collector: summary.collector,
        expectedAmount: summary.expectedAmount,
        receivedAmount: received,
        totalExpenses: expenses,
        initialCash: initial,
        cashBroughtByCollector,
        collectorCarryCash: toMoney(dto.collectorCarryCash),
        totalSales: sales,
        mochi,
        internalDebtCharge,
        cashAbono,
        finalCash,
        cashCount,
        difference: toMoney(cashCount - finalCash),
        effectiveness: summary.effectiveness,
        invoicesIn: summary.invoicesIn,
        invoicesOut: summary.invoicesOut,
        paidInvoices: summary.paidInvoices,
        waitingInvoices: summary.waitingInvoices,
        refinancedLoans: summary.refinancedLoans,
        details,
        notes: dto.notes?.trim() || null,
        createdBy: username,
      }),
    );
    await this.audit.log(username, 'Cierre de caja', 'Crear', close.number);
    return this.closures.findOne({
      where: { id: close.id },
      relations: { route: true },
    });
  }
}
