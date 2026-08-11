import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  async routeWorkbook(date: string) {
    const routes = await this.dataSource.query<Array<{ id: string; code: string; name: string; collector: string }>>('SELECT id,code,name,collector FROM routes WHERE active=true ORDER BY code');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Cartera Eli'; workbook.created = new Date();
    for (const route of routes) {
      const rows = await this.dataSource.query<Array<Record<string, unknown>>>(`
        SELECT c.code AS client_code, concat_ws(' ',c.first_names,c.last_names) AS client_name,
          c.primary_phone AS phone, c.address, l.number AS loan_number, l.loan_date,
          MAX(i.due_date) AS end_date, l.installment_count, COUNT(i.id) FILTER (WHERE i.status='Pagada') AS paid_installments,
          l.frequency, l.daily_installment, l.generated_interest,
          COALESCE(SUM(i.amount-i.paid_amount),0) AS balance,
          COALESCE(SUM(i.amount-i.paid_amount) FILTER (WHERE i.due_date<$2::date),0) AS overdue,
          l.observations
        FROM loans l JOIN clients c ON c.id=l.client_id LEFT JOIN installments i ON i.loan_id=l.id
        WHERE l.route_id=$1 AND l.status IN ('Activo','En mora')
        GROUP BY c.code,c.first_names,c.last_names,c.primary_phone,c.address,l.id ORDER BY c.first_names,c.last_names`, [route.id, date]);
      const safeName = `${route.code} ${route.collector ?? ''}`.replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31);
      const sheet = workbook.addWorksheet(safeName || route.code, { views: [{ state: 'frozen', ySplit: 4 }] });
      sheet.mergeCells('A1:O1'); sheet.getCell('A1').value = `RUTA DE COBRO · ${route.name}`;
      sheet.mergeCells('A2:O2'); sheet.getCell('A2').value = `Cobrador: ${route.collector ?? 'Sin asignar'} · Fecha: ${date}`;
      sheet.getRow(4).values = ['Código','Cliente','Teléfono','Dirección','Préstamo','Inicio','Fin','# cuotas','Pagadas','Modalidad','Valor cuota','Interés','Saldo','Vencido','Observaciones'];
      for (const row of rows) sheet.addRow(Object.values(row));
      sheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }; sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10243E' } };
      sheet.getRow(2).font = { color: { argb: 'FF475569' } };
      sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176B87' } };
      sheet.columns = [12,28,16,30,14,12,12,10,10,14,16,16,16,16,28].map((width) => ({ width }));
      for (const column of ['K','L','M','N']) sheet.getColumn(column).numFmt = '$ #,##0';
      sheet.autoFilter = 'A4:O4';
    }
    return workbook.xlsx.writeBuffer();
  }
}

