import { Injectable, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { DataSource } from 'typeorm';

type RouteRow = {
  id: string;
  code: string;
  name: string;
  collector: string | null;
};
type CollectionRow = {
  client_code: string;
  client_name: string;
  phone: string | null;
  address: string | null;
  loan_number: string;
  loan_date: string;
  end_date: string;
  installment_count: number;
  paid_installments: number;
  frequency: string;
  daily_installment: string;
  balance: string;
};

@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  async routeWorkbook(date: string, routeId = '') {
    const params: unknown[] = [];
    let filter = 'active=true';
    if (routeId) {
      params.push(routeId);
      filter += ` AND id=$${params.length}`;
    }
    const routes = await this.dataSource.query<RouteRow[]>(
      `SELECT id,code,name,collector FROM routes WHERE ${filter} ORDER BY code`,
      params,
    );
    if (!routes.length)
      throw new NotFoundException(
        routeId
          ? 'La ruta seleccionada no existe o está inactiva'
          : 'No hay rutas activas para exportar',
      );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Cartera Eli';
    workbook.created = new Date();
    for (const route of routes) {
      const rows = await this.dataSource.query<CollectionRow[]>(
        `
        SELECT c.code AS client_code, concat_ws(' ',c.first_names,c.last_names) AS client_name,
          c.primary_phone AS phone, c.address, l.number AS loan_number, l.loan_date,
          MAX(i.due_date) AS end_date, l.installment_count,
          COUNT(i.id) FILTER (WHERE i.status='Pagada') AS paid_installments,
          l.frequency, l.daily_installment,
          COALESCE(SUM(GREATEST(i.amount-i.paid_amount,0)),0) AS balance
        FROM loans l JOIN clients c ON c.id=l.client_id LEFT JOIN installments i ON i.loan_id=l.id
        WHERE l.route_id=$1 AND l.status IN ('Activo','En mora')
        GROUP BY c.code,c.first_names,c.last_names,c.primary_phone,c.address,l.id
        ORDER BY c.first_names,c.last_names`,
        [route.id],
      );
      const safeName = `${route.code} ${route.collector ?? ''}`
        .replace(/[\\/?*[\]:]/g, ' ')
        .slice(0, 31);
      const sheet = workbook.addWorksheet(safeName || route.code, {
        views: [{ state: 'frozen', ySplit: 4 }],
      });
      sheet.mergeCells('A1:N1');
      sheet.getCell('A1').value = `RUTA DE COBRO · ${route.name}`;
      sheet.mergeCells('A2:N2');
      sheet.getCell('A2').value =
        `Cobrador: ${route.collector ?? 'Sin asignar'} · Fecha: ${date}`;
      sheet.getRow(4).values = [
        'Código',
        'Cliente',
        'Teléfono',
        'Dirección',
        'Préstamo',
        'Inicio',
        'Fin',
        '# cuotas',
        'Pagadas',
        'Modalidad',
        'Valor cuota',
        'Saldo actual',
        'Valor abono',
        'Saldo nuevo',
      ];
      for (const row of rows) {
        const added = sheet.addRow([
          row.client_code,
          row.client_name,
          row.phone,
          row.address,
          row.loan_number,
          row.loan_date,
          row.end_date,
          Number(row.installment_count),
          Number(row.paid_installments),
          row.frequency,
          Number(row.daily_installment),
          Number(row.balance),
          null,
          null,
        ]);
        const number = added.number;
        added.getCell(13).dataValidation = {
          type: 'decimal',
          operator: 'greaterThanOrEqual',
          allowBlank: true,
          formulae: [0],
          showErrorMessage: true,
          errorTitle: 'Valor inválido',
          error: 'El abono debe ser un número mayor o igual a cero.',
        };
        added.getCell(13).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3CD' },
        };
        added.getCell(14).value = {
          formula: `MAX(0,L${number}-IF(M${number}="",0,M${number}))`,
        };
        added.getCell(14).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8EEF2' },
        };
      }
      sheet.getRow(1).font = {
        bold: true,
        size: 16,
        color: { argb: 'FFFFFFFF' },
      };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10243E' },
      };
      sheet.getRow(2).font = { color: { argb: 'FF475569' } };
      sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(4).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF176B87' },
      };
      sheet.columns = [
        12, 28, 16, 30, 14, 12, 12, 10, 10, 14, 16, 16, 16, 16,
      ].map((width) => ({ width }));
      for (const column of ['K', 'L', 'M', 'N'])
        sheet.getColumn(column).numFmt = '$ #,##0';
      sheet.autoFilter = 'A4:N4';
    }
    return workbook.xlsx.writeBuffer();
  }
}
