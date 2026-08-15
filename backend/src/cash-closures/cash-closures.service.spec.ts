import { CashClosuresService } from './cash-closures.service';

describe('CashClosuresService automatic summary', () => {
  it('maps daily loans, closed loans, moche, prior collector cash and sales', async () => {
    const query = jest
      .fn<(sql: string, parameters: unknown[]) => Promise<unknown[]>>()
      .mockResolvedValue([
        {
          invoices_in: '2',
          invoices_out: '1',
          expected_invoices: '5',
          paid_invoices: '2',
          waiting_invoices: '3',
          sales_payments: '30000',
          cancelled_payments: '10000',
          refinanced_count: '1',
          refinanced_amount: '75000',
          mochi: '50000',
          total_sales: '175000',
          outstanding_due: '70000',
          received_amount: '40000',
          initial_cash: '22222',
          cash_brought_by_collector: '12345',
        },
      ]);
    const routes = {
      findOne: jest.fn().mockResolvedValue({
        id: 'route-id',
        code: 'RT-0001',
        name: 'Centro',
        collector: 'Ana',
      }),
    };
    const service = new CashClosuresService(
      { query } as never,
      {} as never,
      routes as never,
      {} as never,
    );

    const result = await service.summary('route-id', '2026-08-15');

    expect(result.invoicesIn).toBe(2);
    expect(result.invoicesOut).toBe(1);
    expect(result.mochi).toBe(50_000);
    expect(result.cashBroughtByCollector).toBe(12_345);
    expect(result.totalSales).toBe(175_000);
    expect(result.ratingPercentage).toBe(0.4);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
