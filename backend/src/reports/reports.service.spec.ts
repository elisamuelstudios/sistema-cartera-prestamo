import ExcelJS from 'exceljs';
import { ReportsService } from './reports.service';

describe('ReportsService route workbook', () => {
  it('exports only the selected route and leaves the payment column editable', async () => {
    const query = jest
      .fn<(sql: string, parameters: unknown[]) => Promise<unknown[]>>()
      .mockResolvedValueOnce([
        { id: 'route-id', code: 'RT-0001', name: 'Centro', collector: 'Ana' },
      ])
      .mockResolvedValueOnce([
        {
          client_code: 'CL-0001',
          client_name: 'Cliente Prueba',
          phone: '3000000000',
          address: 'Calle 1',
          loan_number: 'PR-000001',
          loan_date: '2026-08-01',
          end_date: '2026-09-01',
          installment_count: 25,
          paid_installments: 5,
          frequency: 'Diario',
          daily_installment: '10000',
          balance: '200000',
        },
      ]);
    const service = new ReportsService({ query } as never);

    const buffer = await service.routeWorkbook('2026-08-15', 'route-id');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];

    expect(query).toHaveBeenCalledTimes(2);
    expect(sheet.getCell('K4').value).toBe('Valor cuota');
    expect(sheet.getCell('L4').value).toBe('Saldo actual');
    expect(sheet.getCell('M4').value).toBe('Valor abono');
    expect(sheet.getCell('N4').value).toBe('Saldo nuevo');
    expect(sheet.getCell('M5').value).toBeNull();
    expect(sheet.getCell('M5').dataValidation.type).toBe('decimal');
    expect(sheet.getCell('N5').value).toEqual({
      formula: 'MAX(0,L5-IF(M5="",0,M5))',
    });
  });
});
