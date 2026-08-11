import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';

@ApiTags('portfolio') @ApiBearerAuth() @Controller('portfolio')
export class PortfolioController {
  constructor(private readonly service: PortfolioService) {}
  @Get() findAll(@Query('search') search = '', @Query('state') state = '', @Query('routeId') routeId = '', @Query('page') page = '1', @Query('pageSize') pageSize = '25') {
    return this.service.findAll(search, state, routeId, Math.max(1, Number(page)), Math.min(100, Math.max(1, Number(pageSize))));
  }
}

