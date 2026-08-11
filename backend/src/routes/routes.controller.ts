import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateRouteDto, UpdateRouteDto } from './dto/route.dto';
import { RoutesService } from './routes.service';

@ApiTags('routes') @ApiBearerAuth() @Controller('routes')
export class RoutesController {
  constructor(private readonly service: RoutesService) {}
  @Get() findAll(@Query('active') active?: string) { return this.service.findAll(active === undefined ? undefined : active === 'true'); }
  @Post() create(@Body() dto: CreateRouteDto, @CurrentUser() user: AuthenticatedUser) { return this.service.create(dto, user.username); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateRouteDto) { return this.service.update(id, dto); }
}
