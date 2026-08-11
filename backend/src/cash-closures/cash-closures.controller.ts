import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CashClosuresService } from './cash-closures.service';
import { CreateCashCloseDto } from './dto/cash-close.dto';

@ApiTags('cash-closures') @ApiBearerAuth() @Controller('cash-closures')
export class CashClosuresController {
  constructor(private readonly service: CashClosuresService) {}
  @Get() findAll(@Query('routeId') routeId = '') { return this.service.findAll(routeId); }
  @Get('summary') summary(@Query('routeId') routeId: string, @Query('date') date: string) { return this.service.summary(routeId, date); }
  @Post() create(@Body() dto: CreateCashCloseDto, @CurrentUser() user: AuthenticatedUser) { return this.service.create(dto, user.username); }
}
