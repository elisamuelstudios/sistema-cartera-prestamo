import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@ApiTags('clients') @ApiBearerAuth() @Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}
  @Get() findAll(@Query('search') search = '', @Query('status') status = '', @Query('page') page = '1', @Query('pageSize') pageSize = '25', @Query('collectable') collectable = 'false', @Query('routeId') routeId = '') {
    return this.service.findAll(search, status, Math.max(1, Number(page)), Math.min(100, Math.max(1, Number(pageSize))), collectable === 'true', routeId);
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthenticatedUser) { return this.service.create(dto, user.username); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateClientDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user.username);
  }
}
