import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LoansService } from '../loans/loans.service';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource, private readonly loans: LoansService) {}
  async summary() {
    await this.loans.refreshOverdueStatuses();
    const [kpis] = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        (SELECT COUNT(*) FROM clients) AS clients,
        (SELECT COUNT(*) FROM loans WHERE status IN ('Activo','En mora')) AS active_loans,
        (SELECT COALESCE(SUM(outstanding_principal),0) FROM loans WHERE status IN ('Activo','En mora')) AS portfolio,
        (SELECT COALESCE(SUM(overdue_amount),0) FROM loans WHERE status='En mora') AS overdue,
        (SELECT COALESCE(SUM(amount),0) FROM payments WHERE payment_date=CURRENT_DATE) AS collected_today,
        (SELECT COUNT(*) FROM installments WHERE due_date=CURRENT_DATE AND paid_amount<amount) AS due_today,
        (SELECT COUNT(*) FROM installments WHERE status='Vencida') AS overdue_installments
    `);
    const byRoute = await this.dataSource.query(`
      SELECT r.code, r.name, r.collector, COALESCE(SUM(l.outstanding_principal),0) AS portfolio,
             COALESCE(SUM(l.overdue_amount),0) AS overdue, COUNT(l.id) FILTER (WHERE l.status IN ('Activo','En mora')) AS loans
      FROM routes r LEFT JOIN loans l ON l.route_id=r.id AND l.status IN ('Activo','En mora')
      GROUP BY r.id ORDER BY r.code`);
    const trend = await this.dataSource.query(`
      SELECT to_char(day::date,'YYYY-MM-DD') AS date, COALESCE(SUM(p.amount),0) AS amount
      FROM generate_series(CURRENT_DATE-INTERVAL '13 days',CURRENT_DATE,INTERVAL '1 day') day
      LEFT JOIN payments p ON p.payment_date=day::date GROUP BY day ORDER BY day`);
    return {
      kpis: Object.fromEntries(Object.entries(kpis ?? {}).map(([key, value]) => [key, Number(value)])),
      byRoute: byRoute.map((row: Record<string, string>) => ({ ...row, portfolio: Number(row.portfolio), overdue: Number(row.overdue), loans: Number(row.loans) })),
      trend: trend.map((row: Record<string, string>) => ({ date: row.date, amount: Number(row.amount) })),
    };
  }
}

