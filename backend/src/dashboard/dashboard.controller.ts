import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard') @ApiBearerAuth() @Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get() summary() { return this.service.summary(); }
}

