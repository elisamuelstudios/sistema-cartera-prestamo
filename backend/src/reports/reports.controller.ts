import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';

@ApiTags('reports') @ApiBearerAuth() @Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Get('routes.xlsx')
  async routes(@Query('date') date: string, @Res() response: Response) {
    const selectedDate = date || new Date().toISOString().slice(0, 10);
    const buffer = await this.service.routeWorkbook(selectedDate);
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', `attachment; filename="rutas-${selectedDate}.xlsx"`);
    response.send(Buffer.from(buffer));
  }
}
