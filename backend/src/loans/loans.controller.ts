import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateLoanDto, LoanPreviewDto, RefinanceLoanDto, UpdateLoanDto } from './dto/loan.dto';
import { LoansService } from './loans.service';

@ApiTags('loans') @ApiBearerAuth() @Controller('loans')
export class LoansController {
  constructor(private readonly service: LoansService) {}
  @Get() findAll(
    @Query('code') code = '', @Query('clientName') clientName = '', @Query('identification') identification = '',
    @Query('status') status = '', @Query('page') page = '1', @Query('pageSize') pageSize = '25',
    @Query('clientId') clientId = '', @Query('routeId') routeId = '',
  ) {
    return this.service.findAll(code, clientName, identification, status, Math.max(1, Number(page)), Math.min(100, Math.max(1, Number(pageSize))), clientId, routeId);
  }
  @Get('codes') codes() { return this.service.codes(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post('preview') preview(@Body() dto: LoanPreviewDto) { return this.service.preview(dto); }
  @Post() create(@Body() dto: CreateLoanDto, @CurrentUser() user: AuthenticatedUser) { return this.service.create(dto, user.username); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateLoanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user.username);
  }
  @Post(':id/refinance') refinance(@Param('id') id: string, @Body() dto: RefinanceLoanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.refinance(id, dto, user.username);
  }
  @Delete(':id') remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.username);
  }
}
