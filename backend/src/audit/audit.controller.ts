import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AuditService } from './audit.service';

@ApiTags('audit') @ApiBearerAuth() @Roles(UserRole.ADMIN) @Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}
  @Get() findAll(@Query('limit') limit?: string) { return this.service.findAll(Number(limit ?? 200)); }
}

