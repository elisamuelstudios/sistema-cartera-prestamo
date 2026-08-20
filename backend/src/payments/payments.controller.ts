import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments') @ApiBearerAuth() @Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}
  @Get() findAll(
    @Query('receipt') receipt = '', @Query('clientName') clientName = '', @Query('identification') identification = '',
    @Query('page') page = '1', @Query('pageSize') pageSize = '25',
    @Query('method') method = '', @Query('routeId') routeId = '', @Query('loanId') loanId = '',
  ) {
    return this.service.findAll(receipt, clientName, identification, Math.max(1, Number(page)), Math.min(100, Math.max(1, Number(pageSize))), method, routeId, loanId);
  }
  @Get('codes') codes() { return this.service.codes(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser) { return this.service.create(dto, user.username); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user.username);
  }
  @Delete(':id') remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.username);
  }
}
